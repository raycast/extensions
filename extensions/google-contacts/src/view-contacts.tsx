import React from "react";
import { Detail, Toast, showToast, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import * as google from "./api/oauth";
import { fetchContacts } from "./api/endpoints";
import { Contact, Filter, LocalFavorites } from "./types";
import { getPrimaryName, getLocalFavorites } from "./utils";
import ContactsView from "./components/ContactsView";

// Cache keys
const CONTACTS_CACHE_KEY = "google_contacts_cached_data";
const CACHE_TIMESTAMP_KEY = "google_contacts_cache_timestamp";
const CACHE_EXPIRY_TIME = 60 + 24 * 60 * 1000; // 1 Day in milliseconds

// Sort contacts alphabetically by name
function sortContacts(contacts: Contact[], localFavorites: LocalFavorites = {}): Contact[] {
  return contacts.sort((a, b) => {
    // First sort by favorite status (starred contacts first)
    const aFavorite = localFavorites[a.resourceName] || false;
    const bFavorite = localFavorites[b.resourceName] || false;

    if (aFavorite && !bFavorite) return -1;
    if (!aFavorite && bFavorite) return 1;

    // Then sort alphabetically by name
    const aName = getPrimaryName(a).toLowerCase();
    const bName = getPrimaryName(b).toLowerCase();
    return aName.localeCompare(bName);
  });
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [localFavorites, setLocalFavorites] = useState<LocalFavorites>({});

  // Load cached contacts and favorites immediately
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        // Load favorites first
        const favorites = await getLocalFavorites();
        setLocalFavorites(favorites);

        // Then load cached contacts
        const cachedData = await LocalStorage.getItem<string>(CONTACTS_CACHE_KEY);
        if (cachedData) {
          const parsedContacts = JSON.parse(cachedData) as Contact[];

          // Sort with local favorites in mind
          const sortedContacts = sortContacts(parsedContacts, favorites);

          setContacts(sortedContacts);
          setIsLoading(false);
          console.log(`Loaded ${parsedContacts.length} contacts from cache`);
        }
      } catch (error) {
        console.error("Error loading cached data:", error);
      }
    };

    loadCachedData();
  }, []);

  // Fetch fresh contacts and update cache
  useEffect(() => {
    const fetchFreshContacts = async (retryAfterReauth = false) => {
      try {
        // Check if we need to refresh the cache
        const lastUpdated = await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);
        const now = new Date().getTime();

        // If cache exists and is still fresh, don't refresh immediately
        if (
          !retryAfterReauth &&
          lastUpdated &&
          now - parseInt(lastUpdated) < CACHE_EXPIRY_TIME &&
          contacts.length > 0
        ) {
          console.log("Using cached contacts, still fresh");
          return;
        }

        setIsRefreshing(true);
        await google.authorize();
        const allContacts = await fetchContacts(1000);

        // Sort the contacts with favorites at the top
        const sortedContacts = sortContacts(allContacts, localFavorites);

        // Update state with new contacts
        setContacts(sortedContacts);
        setIsLoading(false);
        setIsRefreshing(false);

        // Save to cache
        await LocalStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(allContacts)); // Store unsorted to allow for favorite changes
        await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());

        console.log(`Fetched and cached ${sortedContacts.length} contacts`);
      } catch (error) {
        console.error("Error fetching fresh contacts:", error);

        // Check if this is an authentication-related error
        const errorStr = String(error).toLowerCase();
        const isAuthError =
          errorStr.includes("unauthorized") ||
          errorStr.includes("unauthenticated") ||
          errorStr.includes("bad request") ||
          errorStr.includes("invalid") ||
          errorStr.includes("forbidden") ||
          errorStr.includes("401") ||
          errorStr.includes("403");

        if (isAuthError && !retryAfterReauth) {
          // Show toast about authentication issue
          showToast({
            style: Toast.Style.Animated,
            title: "Authentication error detected",
            message: "Attempting to re-login...",
          });

          try {
            // Attempt to force a new authentication
            await google.forceReauthenticate();

            // Try fetching contacts again after successful reauthentication
            showToast({
              style: Toast.Style.Success,
              title: "Re-authenticated successfully",
              message: "Fetching your contacts...",
            });

            await fetchFreshContacts(true); // Retry with flag to prevent infinite loops
            return;
          } catch (reauthError) {
            console.error("Reauthentication failed:", reauthError);
            showToast({
              style: Toast.Style.Failure,
              title: "Login failed",
              message: "Please try again later",
            });
          }
        }

        setIsRefreshing(false);

        // Only show error toast if we don't have cached contacts to show
        if (contacts.length === 0) {
          setIsLoading(false);
          showToast({ style: Toast.Style.Failure, title: String(error) });
        }
      }
    };

    fetchFreshContacts();
  }, [google, localFavorites]);

  if (isLoading && contacts.length === 0) {
    return <Detail isLoading={true} markdown="Loading contacts..." />;
  }

  // Directly show all contacts
  return <ContactsView initialContacts={contacts} filter={Filter.All} isRefreshing={isRefreshing} />;
}

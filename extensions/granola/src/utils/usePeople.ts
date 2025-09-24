import { useState, useEffect } from "react";
import { Person, Company, Attendee, Creator, Document } from "./types";
import getCache from "./getCache";

// Helper function to safely compare dates
function compareDates(date1: string | undefined, date2: string | undefined): number {
  if (!date1 && !date2) return 0;
  if (!date1) return -1;
  if (!date2) return 1;

  const time1 = new Date(date1).getTime();
  const time2 = new Date(date2).getTime();

  // Check for invalid dates
  if (isNaN(time1) && isNaN(time2)) return 0;
  if (isNaN(time1)) return -1;
  if (isNaN(time2)) return 1;

  return time1 - time2;
}

// Helper function to process a person (creator or attendee)
function processPerson(
  personData: Creator | Attendee,
  email: string,
  meetingId: string,
  meetingDate: string,
  documentCreatedAt: string,
  peopleMap: Map<string, Person>,
  defaultNameFallback?: string,
): void {
  if (!email) return;

  const existingPerson = peopleMap.get(email);

  if (existingPerson) {
    // Update existing person with meeting data
    existingPerson.meetingCount = (existingPerson.meetingCount || 0) + 1;
    existingPerson.meetingIds = existingPerson.meetingIds || [];
    existingPerson.meetingIds.push(meetingId);
    if (compareDates(meetingDate, existingPerson.lastMeetingDate) > 0) {
      existingPerson.lastMeetingDate = meetingDate;
    }
  } else {
    // Check multiple places for company name
    let companyName = "";
    if (personData.details?.company?.name) {
      companyName = personData.details.company.name;
    } else if (personData.details?.person?.employment?.name) {
      companyName = personData.details.person.employment.name;
    }

    // Derive name with fallback
    const name = personData.name || personData.details?.person?.name?.fullName || defaultNameFallback || "Unknown";

    const person: Person = {
      id: email, // Use email as ID for uniqueness
      created_at: documentCreatedAt,
      user_id: "",
      name: name,
      job_title: personData.details?.person?.employment?.title || "",
      company_name: companyName,
      company_description: "",
      links: personData.details?.person?.linkedin?.handle
        ? [{ url: personData.details.person.linkedin.handle, title: "LinkedIn" }]
        : [],
      email: email,
      avatar: personData.details?.person?.avatar || "",
      meetingCount: 1,
      lastMeetingDate: meetingDate,
      meetingIds: [meetingId],
    };
    peopleMap.set(email, person);
  }
}

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchPeople = async () => {
      try {
        setIsLoading(true);
        const cacheData = await getCache();

        const peopleMap = new Map<string, Person>();
        const companyMap = new Map<string, Company>();

        // Extract people from documents (meeting attendees)
        if (cacheData?.state?.documents) {
          const documents = cacheData.state.documents;

          Object.values(documents).forEach((doc: unknown) => {
            const document = doc as Document;
            if (document?.people) {
              const meetingDate = document.created_at || "";
              const meetingId = document.id || "";

              // Add creator
              if (document.people.creator) {
                const creator = document.people.creator;
                const email = creator.email || "";
                processPerson(creator, email, meetingId, meetingDate, document.created_at || "", peopleMap, "Unknown");
              }

              // Add attendees
              if (document.people.attendees && Array.isArray(document.people.attendees)) {
                document.people.attendees.forEach((attendee: unknown) => {
                  const attendeeData = attendee as Attendee;
                  const email = attendeeData.email || "";
                  processPerson(
                    attendeeData,
                    email,
                    meetingId,
                    meetingDate,
                    document.created_at || "",
                    peopleMap,
                    email.split("@")[0],
                  );
                });
              }
            }
          });
        }

        // Also add people from the global people array (if exists)
        if (cacheData?.state?.people && Array.isArray(cacheData.state.people)) {
          cacheData.state.people.forEach((person: Person) => {
            if (person.email && !peopleMap.has(person.email)) {
              peopleMap.set(person.email, person);
            }
          });
        }

        const allPeople = Array.from(peopleMap.values());
        setPeople(allPeople);

        const companyMeetingIds = new Map<string, Set<string>>();

        // Extract unique companies from people
        // Use company name if available, otherwise use email domain
        allPeople.forEach((person) => {
          let companyKey = person.company_name;

          // If no company name, try to use email domain as company identifier
          if (!companyKey && person.email && person.email.includes("@")) {
            const domain = person.email.split("@")[1];
            // Use domain as company name, but format it nicely
            if (
              domain &&
              !domain.includes("gmail.com") &&
              !domain.includes("outlook.com") &&
              !domain.includes("yahoo.com")
            ) {
              companyKey = domain;
            }
          }

          if (companyKey) {
            const meetingIds = Array.isArray(person.meetingIds) ? person.meetingIds : [];
            let meetingSet = companyMeetingIds.get(companyKey);
            if (!meetingSet) {
              meetingSet = new Set<string>();
              companyMeetingIds.set(companyKey, meetingSet);
            }

            meetingIds.forEach((id) => {
              if (typeof id === "string" && id.length > 0) {
                meetingSet.add(id);
              }
            });

            const totalMeetings = meetingSet.size;
            const existing = companyMap.get(companyKey);
            if (existing) {
              existing.people.push(person);
              existing.totalMeetings = totalMeetings;
              if (compareDates(person.lastMeetingDate, existing.lastMeetingDate) > 0) {
                existing.lastMeetingDate = person.lastMeetingDate;
              }
            } else {
              companyMap.set(companyKey, {
                name: person.company_name || companyKey,
                description: person.company_description || "",
                people: [person],
                totalMeetings,
                lastMeetingDate: person.lastMeetingDate,
              });
            }
          }
        });

        setCompanies(Array.from(companyMap.values()));
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching people data:", error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    fetchPeople();
  }, []);

  return { people, companies, isLoading, hasError };
}

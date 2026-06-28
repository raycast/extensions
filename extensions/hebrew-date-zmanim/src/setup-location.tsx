import { Action, ActionPanel, Form, Icon, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import tzLookup from "tz-lookup";

export default function SetupLocationCommand() {
  const [addrQuery, setAddrQuery] = useState("");
  const [addrResults, setAddrResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [tz, setTz] = useState("");
  const [locationName, setLocationName] = useState("");

  // Geocode address using public Nominatim API
  useEffect(() => {
    const q = addrQuery.trim();
    if (!q) {
      setAddrResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=0&q=${encodeURIComponent(q)}`;
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { "Accept-Language": "en", "User-Agent": "raycast-hebrew-zmanim/0.2" },
        });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        const data = (await resp.json()) as Array<{ display_name: string; lat: string; lon: string }>;
        if (!cancelled) setAddrResults(data);
      } catch {
        if (!cancelled) setAddrResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [addrQuery]);

  async function saveLocation() {
    try {
      if (!lat || !lon || !tz || !locationName) {
        throw new Error("Please select an address or enter coordinates manually.");
      }

      const payload = {
        locationName,
        lat: Number(lat),
        lon: Number(lon),
        tz,
        elev: 0,
      };

      await LocalStorage.setItem("zmanim:lastLocation", JSON.stringify(payload));
      await showToast({
        style: Toast.Style.Success,
        title: "Location Saved",
        message: `${locationName} saved for zmanim calculations`,
      });
      await popToRoot();
    } catch (e) {
      await showFailureToast(e, { title: "Failed to save location" });
    }
  }

  return (
    <Form
      isLoading={isSearching}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Location" icon={Icon.Checkmark} onSubmit={saveLocation} />
        </ActionPanel>
      }
    >
      <Form.Description text="Search for your address." />
      <Form.TextField
        id="address"
        title="Search Address"
        placeholder="e.g., Brooklyn, NY 11213"
        value={addrQuery}
        onChange={setAddrQuery}
      />
      {addrQuery.trim() && !addrResults.length && !isSearching && (
        <Form.Description text="No matching addresses found. Try a different search term." />
      )}
      {!!addrResults.length && (
        <Form.Dropdown
          id="addressResults"
          title={
            isSearching
              ? "Select from Matching Addresses (searching…)"
              : `Select from ${addrResults.length} Matching Addresses`
          }
          storeValue={false}
          onChange={(val) => {
            const [lt, ln, name] = val.split("|");
            setLat(lt);
            setLon(ln);
            setLocationName(name);
            try {
              setTz(tzLookup(Number(lt), Number(ln)));
            } catch {
              // Ignore timezone lookup errors
            }
          }}
        >
          {addrResults.map((r, i) => (
            <Form.Dropdown.Item
              key={`${r.lat},${r.lon}-${i}`}
              value={`${r.lat}|${r.lon}|${r.display_name}`}
              title={r.display_name}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.Description text="Selected Location Details:" />
      <Form.TextField id="locationName" title="Location Name" value={locationName} onChange={setLocationName} />
      <Form.TextField id="latitude" title="Latitude" value={lat} onChange={setLat} />
      <Form.TextField id="longitude" title="Longitude" value={lon} onChange={setLon} />
      <Form.TextField id="timeZoneId" title="Time Zone ID" value={tz} onChange={setTz} />
      <Form.Description text="After saving, use 'Zmanim for Date' to see all zmanim for today." />
    </Form>
  );
}

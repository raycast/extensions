import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchInformation, fetchPresentResources } from "./api/deskly";
import { Booking, PresentBooking, PresentPerson } from "./lib/types";
import OfficeList, { buildSections } from "./components/OfficeList";
import { renderTimeRange, toISODate } from "./lib/format";

function presentPersonToBooking(person: PresentPerson, pb: PresentBooking): Booking {
  return {
    id: pb.id,
    date: new Date(pb.date),
    multipleBookings: null,
    seat: pb.resource,
    seatBooked: null,
    from: pb.from,
    until: pb.until,
    userStatus: null,
    profileImage: person.profileImage,
    userCheckedIn: person.isCheckedIn,
  };
}

export default function Command() {
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(undefined);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());

  const { data: information, isLoading: infoLoading } = useCachedPromise(fetchInformation);

  const primaryLocation = information?.user?.primaryRoom?.location ?? undefined;
  const locations = information?.availableLocations ?? [];
  const effectiveLocation = selectedLocation ?? primaryLocation ?? locations[0]?.id;

  const dateStr = toISODate(new Date());

  const {
    data: presentPeople,
    isLoading: peopleLoading,
    revalidate,
  } = useCachedPromise(fetchPresentResources, [effectiveLocation ?? "", dateStr], { execute: !!effectiveLocation });

  const sections = buildSections(
    presentPeople ?? [],
    (person) => {
      const resource = person.dayBookings[0]?.resource;
      return `${resource?.floorName ?? ""}::${resource?.roomName ?? "Unknown"}`;
    },
    (first) => {
      const resource = first.dayBookings[0]?.resource;
      return resource?.floorName ? `${resource.floorName} · ${resource.roomName}` : resource?.roomName ?? "Unknown";
    },
    (person) => {
      const pb = person.dayBookings[0];
      const booking = pb ? presentPersonToBooking(person, pb) : undefined;
      const isCurrentUser = !!information?.user.id && person.userId === information.user.id;
      return {
        key: person.userId,
        profileImage: person.profileImage,
        title: `${person.firstName} ${person.lastName}`,
        personName: `${person.firstName} ${person.lastName}`,
        subtitle: pb?.resource.name ?? "",
        isCheckedIn: person.isCheckedIn || checkedInIds.has(pb?.id ?? ""),
        timeRange: renderTimeRange(pb?.from ?? null, pb?.until ?? null),
        booking,
        ...(isCurrentUser && booking
          ? {
              onCheckedIn: (id: string) => setCheckedInIds((prev) => new Set([...prev, id])),
              onDeleted: () => revalidate(),
            }
          : {}),
      };
    }
  );

  return (
    <List
      isLoading={infoLoading || peopleLoading}
      searchBarAccessory={
        locations.length > 0 ? (
          <List.Dropdown tooltip="Filter by Location" defaultValue={effectiveLocation} onChange={setSelectedLocation}>
            {locations.map((loc) => (
              <List.Dropdown.Item key={loc.id} value={loc.id} title={loc.name} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <OfficeList sections={sections} />
    </List>
  );
}

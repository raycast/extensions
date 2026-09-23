import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import BookingDetail from "./BookingDetail";
import { checkInBooking } from "../api/deskly";
import { Booking } from "../lib/types";
import { confirmDeleteBooking, failToast, profileIcon } from "../lib/utils";
import { isSameDay, toISODate } from "../lib/format";

export interface OfficeListItem {
  key: string;
  profileImage: string | null;
  title: string;
  subtitle: string;
  isCheckedIn: boolean;
  timeRange?: string;
  location?: string;
  floor?: string;
  room?: string;
  booking?: Booking;
  personName?: string;
  onCheckedIn?: (id: string) => void;
  onDeleted?: (id: string) => void;
}

export interface OfficeListSection {
  key: string;
  title: string;
  items: OfficeListItem[];
}

/**
 * Groups `items` by `keyOf` (preserving first-seen order) and maps each group into an
 * `OfficeListSection`. The group key doubles as the section key. Shared by the list commands so the
 * grouping/section-building logic lives in one place.
 */
export function buildSections<T>(
  items: T[],
  keyOf: (item: T) => string,
  sectionTitle: (first: T, groupKey: string) => string,
  toItem: (item: T) => OfficeListItem
): OfficeListSection[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => ({
    key,
    title: sectionTitle(group[0], key),
    items: group.map(toItem),
  }));
}

export default function OfficeList({ sections }: { sections: OfficeListSection[] }) {
  const { apiUrl, showTime } = getPreferenceValues<Preferences>();

  return (
    <>
      {sections.map((section) => (
        <List.Section key={section.key} title={section.title}>
          {section.items.map((item) => {
            const booking = item.booking;
            return (
              <List.Item
                key={item.key}
                icon={profileIcon(item.profileImage, apiUrl)}
                title={item.title}
                subtitle={item.subtitle}
                accessories={[
                  ...(item.isCheckedIn ? [{ icon: Icon.CheckCircle }] : []),
                  ...(showTime && item.timeRange ? [{ text: item.timeRange }] : []),
                  ...(item.location ? [{ text: item.location }] : []),
                  ...(item.floor ? [{ text: item.floor, icon: Icon.ArrowUp }] : []),
                  ...(item.room ? [{ text: item.room, icon: Icon.Map }] : []),
                ]}
                actions={
                  booking ? (
                    <ActionPanel>
                      <Action.Push
                        title="Show Details"
                        icon={Icon.Sidebar}
                        target={
                          <BookingDetail
                            booking={booking}
                            onDeleted={item.onDeleted ? () => item.onDeleted?.(booking.id) : undefined}
                            personName={item.personName}
                            profileImage={item.profileImage}
                          />
                        }
                      />
                      {isSameDay(booking.date, new Date()) && !item.isCheckedIn && item.onCheckedIn && (
                        <Action
                          title="Check In"
                          icon={Icon.CheckCircle}
                          onAction={async () => {
                            const toast = await showToast({ style: Toast.Style.Animated, title: "Checking in…" });
                            try {
                              await checkInBooking(booking.id);
                              item.onCheckedIn?.(booking.id);
                              toast.style = Toast.Style.Success;
                              toast.title = "Checked in";
                            } catch (error) {
                              failToast(toast, "Check-in failed", error);
                            }
                          }}
                        />
                      )}
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        icon={Icon.Globe}
                        url={`${apiUrl}/en/overview/${toISODate(booking.date)}`}
                      />
                      {item.onDeleted && (
                        <Action
                          title="Delete Booking"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => confirmDeleteBooking(booking, () => item.onDeleted?.(booking.id))}
                        />
                      )}
                    </ActionPanel>
                  ) : undefined
                }
              />
            );
          })}
        </List.Section>
      ))}
    </>
  );
}

import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import BookingDetail from "./BookingDetail";
import { checkInBooking } from "../api/deskly";
import { Booking } from "../lib/types";
import { confirmDeleteBooking, profileIcon } from "../lib/utils";
import { isSameDay } from "../lib/format";

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
                              toast.style = Toast.Style.Failure;
                              toast.title = "Check-in failed";
                              toast.message = String(error);
                            }
                          }}
                        />
                      )}
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        icon={Icon.Globe}
                        url={`${apiUrl}/en/overview/${booking.date.toISOString().substring(0, 10)}`}
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

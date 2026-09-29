import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { searchHotels, SearchParams, SortBy } from "./api";

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function Results({ params }: { params: SearchParams }) {
  const { data: hotels, isLoading } = usePromise(searchHotels, [params], {
    onError: (error) => {
      showFailureToast(error, { title: "Hotel search failed" });
    },
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${params.destination}: ${params.checkIn} to ${params.checkOut}`}
      searchBarPlaceholder="Filter hotels by name"
    >
      <List.EmptyView icon={Icon.Building} title="No hotels found" description="Try other dates or a nearby city." />
      {hotels?.map((hotel) => (
        <List.Item
          key={hotel.id}
          icon={hotel.image_url ? { source: hotel.image_url } : Icon.Building}
          title={hotel.name}
          subtitle={hotel.star_rating > 0 ? "★".repeat(hotel.star_rating) : undefined}
          accessories={[{ text: formatPrice(hotel.price, hotel.currency), tooltip: "Total stay for 2 adults" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Book on trip1" url={hotel.booking_link} />
              <Action.CopyToClipboard title="Copy Booking Link" content={hotel.booking_link} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface FormValues {
  destination: string;
  checkIn: Date | null;
  checkOut: Date | null;
  sortBy: SortBy;
}

export default function Command() {
  const { push } = useNavigation();
  const today = new Date();

  function submit(values: FormValues) {
    const checkIn = values.checkIn ?? addDays(today, 14);
    const checkOut = values.checkOut ?? addDays(checkIn, 2);
    push(
      <Results
        params={{
          destination: values.destination.trim(),
          checkIn: isoDate(checkIn),
          checkOut: isoDate(checkOut),
          sortBy: values.sortBy,
        }}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Hotels" icon={Icon.MagnifyingGlass} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Prices are for 2 adults in one room." />
      <Form.TextField id="destination" title="Destination" placeholder="Lisbon, Portugal" autoFocus />
      <Form.DatePicker
        id="checkIn"
        title="Check-In"
        type={Form.DatePicker.Type.Date}
        defaultValue={addDays(today, 14)}
        min={today}
      />
      <Form.DatePicker
        id="checkOut"
        title="Check-Out"
        type={Form.DatePicker.Type.Date}
        defaultValue={addDays(today, 16)}
        min={addDays(today, 1)}
      />
      <Form.Dropdown id="sortBy" title="Sort By" defaultValue="relevance">
        <Form.Dropdown.Item value="relevance" title="Relevance" />
        <Form.Dropdown.Item value="price" title="Lowest Price" />
        <Form.Dropdown.Item value="rating" title="Highest Rating" />
        <Form.Dropdown.Item value="distance" title="Distance" />
      </Form.Dropdown>
    </Form>
  );
}

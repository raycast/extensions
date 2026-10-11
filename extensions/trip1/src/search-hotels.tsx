import { Action, ActionPanel, Color, Form, Icon, List, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, usePromise } from "@raycast/utils";
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

function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
  } catch {
    return `${price.toFixed(2)} ${currency}`;
  }
}

function Results({ params }: { params: SearchParams }) {
  const {
    data: hotels,
    isLoading,
    error,
    revalidate,
  } = usePromise(searchHotels, [params], {
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
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Search failed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.Building} title="No hotels found" description="Try other dates or a nearby city." />
      )}
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
  sortBy: string;
}

export default function Command() {
  const { push } = useNavigation();
  const today = startOfDay(new Date());

  const { handleSubmit, itemProps, values, setValidationError } = useForm<FormValues>({
    initialValues: { checkIn: addDays(today, 14), checkOut: addDays(today, 16), sortBy: "relevance" },
    validation: {
      destination: (value) => (value?.trim() ? undefined : "Enter a destination"),
      checkIn: (value) => {
        if (!value) return "Pick a check-in date";
        if (startOfDay(value) < today) return "Check-in can't be in the past";
      },
      checkOut: FormValidation.Required,
    },
    onSubmit: (form) => {
      const checkIn = startOfDay(form.checkIn as Date);
      const checkOut = startOfDay(form.checkOut as Date);
      if (checkOut <= checkIn) {
        setValidationError("checkOut", "Check-out must be after check-in");
        return;
      }
      push(
        <Results
          params={{
            destination: form.destination.trim(),
            checkIn: isoDate(checkIn),
            checkOut: isoDate(checkOut),
            sortBy: form.sortBy as SortBy,
          }}
        />,
      );
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Hotels" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Prices are for 2 adults in one room." />
      <Form.TextField title="Destination" placeholder="Lisbon, Portugal" autoFocus {...itemProps.destination} />
      <Form.DatePicker title="Check-In" type={Form.DatePicker.Type.Date} min={today} {...itemProps.checkIn} />
      <Form.DatePicker
        title="Check-Out"
        type={Form.DatePicker.Type.Date}
        min={values.checkIn ? addDays(values.checkIn, 1) : addDays(today, 1)}
        {...itemProps.checkOut}
      />
      <Form.Dropdown title="Sort By" {...itemProps.sortBy}>
        <Form.Dropdown.Item value="relevance" title="Relevance" />
        <Form.Dropdown.Item value="price" title="Lowest Price" />
        <Form.Dropdown.Item value="rating" title="Highest Rating" />
        <Form.Dropdown.Item value="distance" title="Distance" />
      </Form.Dropdown>
    </Form>
  );
}

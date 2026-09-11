export type CalendlyUri = string;

export interface CalendlyUser {
  uri: CalendlyUri;
  name: string;
  slug: string;
  email: string;
  scheduling_url: string;
  timezone: string;
  current_organization: CalendlyUri;
}

export interface EventTypeLocation {
  kind: string;
  location?: string;
  phone_number?: string;
}

export interface EventType {
  uri: CalendlyUri;
  name: string;
  active: boolean;
  booking_method?: string;
  color?: string;
  description_plain?: string | null;
  duration: number;
  kind: string;
  locations: EventTypeLocation[];
  pooling_type?: string | null;
  scheduling_url: string;
  slug: string;
  type: string;
}

export interface AvailableTime {
  status: "available" | string;
  start_time: string;
  invitees_remaining?: number;
  scheduling_url?: string;
}

export interface MeetingLocation {
  type?: string;
  location?: string;
  join_url?: string;
  status?: string;
}

export interface EventGuest {
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventMembership {
  user?: CalendlyUri;
  user_email?: string;
  user_name?: string;
}

export interface ScheduledEvent {
  uri: CalendlyUri;
  name: string;
  status: "active" | "canceled" | string;
  start_time: string;
  end_time: string;
  event_type: CalendlyUri;
  location?: MeetingLocation | null;
  event_guests?: EventGuest[];
  event_memberships?: EventMembership[];
}

export interface Invitee {
  uri: CalendlyUri;
  name: string;
  email: string;
  status: "active" | "canceled" | string;
  timezone: string;
  cancel_url?: string;
  reschedule_url?: string;
  no_show?: CalendlyUri | null;
}

export interface SchedulingLink {
  booking_url: string;
  owner: CalendlyUri;
  owner_type: string;
}

export interface CreatedInvitee extends Invitee {
  event: CalendlyUri;
  created_at?: string;
}

export interface CalendlyResourceResponse<T> {
  resource: T;
}

export interface CalendlyCollectionResponse<T> {
  collection: T[];
  pagination?: {
    count?: number;
    next_page?: string | null;
    next_page_token?: string | null;
    previous_page?: string | null;
    previous_page_token?: string | null;
  };
}

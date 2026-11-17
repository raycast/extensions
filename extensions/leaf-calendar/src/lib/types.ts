// Leaf Calendar local API, version 1. See docs/api.md in the leaf-calendar repo.

export type Response = "accepted" | "tentative" | "declined" | "needsAction";

export type HelloParams = { client: string; icon?: string; returnUrl?: string; askOnLink?: string };
export type HelloResult = { leafVersion: string; apiVersion: number; profile: string };

export type Calendar = {
  id: string;
  account: string;
  name: string;
  color: string;
  canEdit: boolean;
  isDefault: boolean;
};

export type LeafEvent = {
  id: string;
  calendarId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  response: Response;
  color: string;
  meetingLink: string | null;
};

export type Guest = { name: string | null; email: string; response: Response; organizer: boolean };

export type LeafEventDetail = LeafEvent & { description: string; guests: Guest[] };

export type MoveScope = "this" | "following" | "all";

export type SchedulingLink = { id: string; provider: string; name: string; minutes: number; allowsGuests: boolean };

export type TimeRange = { start: string; end: string };

export type BookingGuest = { name?: string; email: string };

export type Person = { name: string | null; email: string };

// Scheduled Windows: Leaf Calendar's share groups (times offered to someone, kept until booked, deleted, or passed)
export type Share = {
  id: string;
  title: string;
  message: string;
  times: TimeRange[];
  guests: { name: string | null; email: string }[];
  link: { id: string; minutes: number } | null;
};

// Method Name To Params And Result
export type Methods = {
  "leaf.hello": { params: HelloParams; result: HelloResult };
  "calendars.list": { params: Record<string, never>; result: Calendar[] };
  "events.list": { params: { start: string; end: string; calendarIds?: string[] }; result: LeafEvent[] };
  "events.get": { params: { id: string }; result: LeafEventDetail };
  "events.create": {
    params: {
      title: string;
      start: string;
      end: string;
      calendarId?: string;
      location?: string;
      description?: string;
      guests?: string[];
      notifyGuests?: boolean;
      meet?: boolean;
    };
    result: { id: string };
  };
  "people.search": { params: { query?: string }; result: Person[] };
  "events.move": {
    params: { id: string; start: string; end: string; scope?: MoveScope };
    result: { id: string | null };
  };
  "events.update": {
    params: {
      id: string;
      title?: string;
      start?: string;
      end?: string;
      calendarId?: string;
      location?: string;
      description?: string;
      guests?: string[];
      meet?: boolean;
      scope?: MoveScope;
      notifyGuests?: boolean;
    };
    result: { id: string | null };
  };
  "events.delete": {
    params: { id: string; scope?: MoveScope; notifyGuests?: boolean };
    result: Record<string, never>;
  };
  "meetings.join": { params: { id?: string }; result: { id: string; opened: boolean } };
  "app.showDay": { params: { date: string }; result: Record<string, never> };
  "app.showEvent": { params: { id: string }; result: Record<string, never> };
  "scheduling.links": { params: Record<string, never>; result: SchedulingLink[] };
  "scheduling.openTimes": { params: { linkId: string; start: string; end: string }; result: TimeRange[] };
  "scheduling.timeLink": {
    params: { linkId: string; start: string; guests?: BookingGuest[] };
    result: { url: string };
  };
  "availability.free": {
    params: { start: string; end: string; minutes?: number; linkId?: string };
    result: TimeRange[];
  };
  "shares.create": {
    params: { times: TimeRange[]; title?: string; message?: string; guests?: BookingGuest[]; linkId?: string };
    result: { id: string; text: string; html: string | null };
  };
  "shares.list": { params: Record<string, never>; result: Share[] };
  "shares.book": { params: { id: string; start: string; end?: string }; result: { id: string | null } };
  "shares.delete": { params: { id: string }; result: Record<string, never> };
};

export type Method = keyof Methods;

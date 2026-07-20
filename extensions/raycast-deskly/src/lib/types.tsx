export interface Booking {
  id: string;
  date: Date;
  multipleBookings: boolean | null;
  seat: BookingSeat | null;
  seatBooked: BookingSeat | null;
  from: string | null;
  until: string | null;
  userStatus: string | null;
  profileImage: string | null;
  userCheckedIn: boolean | null;
}

export interface BookingSeat {
  id: string;
  number: number | null;
  name: string;
  floorName: string;
  locationId: string;
  locationName: string;
  roomName: string;
  room: string | null;
  locationX: number | null;
  locationY: number | null;
}

export interface AuthData {
  token: string;
  tokenExpiration: number;
  refreshToken: string;
  refreshTokenExpiration: number;
}

export interface Location {
  id: string;
  name: string;
}

export interface PresentBooking {
  id: string;
  type: string;
  resource: BookingSeat;
  date: string;
  from: string;
  until: string;
}

export interface PresentPerson {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
  profileImage: string | null;
  dayBookings: PresentBooking[];
  isCheckedIn: boolean;
}

export interface Information {
  user: {
    id: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    primaryRoom: {
      id: string | null;
      name: string | null;
      floor: string | null;
      location: string | null;
    };
  };
  accountInformation: {
    maxBookingDays: number | null;
  };
  availableLocations: Location[];
}

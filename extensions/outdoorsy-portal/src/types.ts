export interface IPreferences {
  adminToken: string;
  useArcSpace?: string;
}

export enum EAdminSearchType {
  User = "user",
  Rental = "rental",
  Booking = "booking",
  Campground = "campground"
}

export interface IAdminSearchResultUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
}

interface IAdminSearchResultUsers {
  object_data: IAdminSearchResultUser[]
  object_type: EAdminSearchType.User
}

export interface IAdminSearchResultRental {
  id: number;
  rental_name: string;
  primary_image_url: string;
  email: string;
  user_id: number;
}

interface IAdminSearchResultRentals {
  object_data: IAdminSearchResultRental[]
  object_type: EAdminSearchType.Rental
}

export interface IAdminSearchResultBooking {
  id: number;
  from: string;
  to: string;
  renter_email: string;
  owner_id: number;
  renter_id: number;
}

interface IAdminSearchResultBookings {
  object_data: IAdminSearchResultBooking[]
  object_type: EAdminSearchType.Booking
}

export interface IAdminSearchResultCampground {
  id: number;
  name: string;
  primary_image_url: string;
  provider_type: string;
}

interface IAdminSearchResultCampgrounds {
  object_data: IAdminSearchResultCampground[]
  object_type: EAdminSearchType.Campground
}

export interface IAdminSearchResponse {
  data: IAdminSearchResultUsers | IAdminSearchResultRentals | IAdminSearchResultBookings | IAdminSearchResultCampgrounds;
}

export interface IAdminUserResponse {
  id: number;
  owner: boolean;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
  }
}

export interface IAdminBookingResponse {
  id: number;
  renter_id: number;
  owner_id: number;
}

export interface IAdminRentalResponse {
  id: number;
  owner_id: number;
  slug: string;
}

export interface IAdminCampgroundResponse {
  id: number;
  name: string;
  provider_type: string;
  slug: string;
}

export interface IActorResponse {
  token: string;
}

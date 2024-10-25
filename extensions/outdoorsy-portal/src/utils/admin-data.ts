import fetch from 'node-fetch'
import { IActorResponse, IAdminBookingResponse, IAdminCampgroundResponse, IAdminRentalResponse, IAdminUserResponse } from "../types"
import { API_URL } from './consts'

export async function adminFetchUser(id: number, adminToken: string) {
  const response = await fetch(`${API_URL}/v0/users/${id}`, { headers: { Admin: adminToken }})
  
  return (await response.json()) as IAdminUserResponse
}

export async function adminFetchBooking(id: number, adminToken: string) {
  const response = await fetch(`${API_URL}/v0/bookings/${id}`, { headers: { Admin: adminToken }})
  
  return (await response.json()) as IAdminBookingResponse
}

export async function adminFetchRental(id: number, adminToken: string) {
  const response = await fetch(`${API_URL}/v0/rentals/${id}`, { headers: { Admin: adminToken }})
  
  return (await response.json()) as IAdminRentalResponse
}

export async function adminFetchCampground(id: number, adminToken: string) {
  const response = await fetch(`${API_URL}/v0/admin/campgrounds/${id}`, { headers: { Admin: adminToken }})
  
  return (await response.json()) as IAdminCampgroundResponse
}

export async function adminFetchActorToken(id: number, adminToken: string) {
  const response = await fetch(`${API_URL}/v0/auth/actor/${id}`, { headers: { Authorization: adminToken }})
  
  return (await response.json()) as IActorResponse
}


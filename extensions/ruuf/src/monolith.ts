import { LocalStorage, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { LocalStorageKey } from "./storage";

const API_URL = "https://api.ruuf.cl";

export async function fetchBookingId(text: string) {
    const cookie =await LocalStorage.getItem(LocalStorageKey.Cookie);
    if (!cookie) {
        await showToast(Toast.Style.Failure, "Cookie not found");
        return "";
    }
    const res = await fetch(`${API_URL}/booking/search/${text}`, {
        headers: {
            cookie: `connect.sid=${cookie.toString()}`
        }
    })
    const data = await res.json();  
    const booking = data as {id: string};
  
    if (!booking.id) {
      await showToast(Toast.Style.Failure, "Booking not found");
      return "";
    }
  
    return booking.id!;
  }
  
import { List, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { IAdminSearchResultBooking } from "../types";
import { APP_URL, PORTAL_URL } from "../utils/consts";
import ImpersonateUserAction from "../common/ImpersonateUserAction";
import { useCallback } from "react";
import { impersonateUser } from "../utils/browser";
import { showFailureToast } from "@raycast/utils";
import { adminFetchBooking } from "../utils/admin-data";
import OpenInBrowserAction from "../common/OpenInBrowserAction";

interface IPortalSearchResultBookingProps {
  booking: IAdminSearchResultBooking;
  adminToken: string;
}

export default function PortalSearchResultBooking(props: IPortalSearchResultBookingProps) {
  const { booking, adminToken } = props;
  const { id, from, to, renter_email, renter_id, owner_id } = booking;

  return (
    <List.Item
      id={`${id}`}
      title={renter_email}
      subtitle={`${from} - ${to}`}
      accessories={[{ icon: Icon.Calendar }]}
      actions={
        <ActionPanel title="Booking Actions">
          <OpenInBrowserAction title="Open in Portal" url={`${PORTAL_URL}/bookings/${id}`} />
          <ImpersonateUserAction title="Impersonate Guest" id={renter_id} adminToken={adminToken} url={`${APP_URL}/trips/${id}`} />
          <ImpersonateUserAction title="Impersonate Host" id={owner_id} adminToken={adminToken} url={`${APP_URL}/dashboard/bookings/${id}`} />
          <Action.CopyToClipboard title="Copy ID" content={id} />
        </ActionPanel>
      }
    />
  )
}

interface IPortalSearchResultBookingByIdProps {
  id: number;
  adminToken: string;
}

export function PortalSearchResultBookingById(props: IPortalSearchResultBookingByIdProps) {
  const { id, adminToken } = props;

  const impersonate = useCallback(async (user: 'guest' | 'host') => {
    showToast({
      title: 'Fetching booking',
      style: Toast.Style.Animated
    })

    try {
      const booking = await adminFetchBooking(id, adminToken)
      
      if (user === 'guest') {
        await impersonateUser(booking.renter_id, adminToken, `${APP_URL}/trips/${id}`)
      } else {
        await impersonateUser(booking.owner_id, adminToken, `${APP_URL}/dashboard/bookings/${id}`)
      }
    } catch (error) {
      showFailureToast(error, {
        title: 'Error fetching booking'
      })
    }
  }, [id, adminToken])

  return (
    <List.Item
      title={`Booking ${id}`}
      accessories={[{ icon: Icon.Calendar }]}
      actions={
        <ActionPanel title="Booking Actions">
          <OpenInBrowserAction title="Open in Portal" url={`${PORTAL_URL}/bookings/${id}`} />
          <Action title="Impersonate Guest" icon={Icon.Person} onAction={() => impersonate('guest')} />
          <Action title="Impersonate Host" icon={Icon.Person} onAction={() => impersonate('host')} />
          <Action.CopyToClipboard title="Copy ID" content={id} />
        </ActionPanel>
      }
    />
  )
}

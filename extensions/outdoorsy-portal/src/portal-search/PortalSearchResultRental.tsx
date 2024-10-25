import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { IAdminSearchResultRental } from "../types";
import { makeCloudinaryTransformedImageUrl } from "../utils/cloudinary";
import { APP_URL, PORTAL_URL } from "../utils/consts";
import OpenInBrowserAction from "../common/OpenInBrowserAction";
import ImpersonateUserAction from "../common/ImpersonateUserAction";
import { adminFetchRental } from "../utils/admin-data";
import { showFailureToast } from "@raycast/utils";
import { useCallback } from "react";
import { impersonateUser, openUrlInDefaultBrowser } from "../utils/browser";

interface IPortalSearchResultRentalProps {
  rental: IAdminSearchResultRental;
  adminToken: string;
}

export default function PortalSearchResultRental(props: IPortalSearchResultRentalProps) {
  const { rental, adminToken } = props;
  const { id, rental_name, email, primary_image_url, user_id } = rental;

  const transformedImageUrl = makeCloudinaryTransformedImageUrl(primary_image_url, 50, 50);

  const viewListing = useCallback(async () => {
    showToast({
      title: 'Fetching rental',
      style: Toast.Style.Animated
    })

    try {
      const rental = await adminFetchRental(id, adminToken)
      
      await openUrlInDefaultBrowser(`${APP_URL}${rental.slug}`)
    } catch (error) {
      showFailureToast(error, {
        title: 'Error fetching rental'
      })
    }
  }, [id, adminToken])

  return (
    <List.Item
      id={`${id}`}
      title={rental_name}
      subtitle={email}
      icon={transformedImageUrl}
      accessories={[{ icon: Icon.Car }]}
      actions={
        <ActionPanel title="Rental Actions">
          <OpenInBrowserAction title="Open in Portal" url={`${PORTAL_URL}/rentals/${id}`} />
          <Action title="View Listing" icon={Icon.Globe} onAction={viewListing} />
          <ImpersonateUserAction id={user_id} adminToken={adminToken} url={`${APP_URL}/dashboard/rentals/${id}`} />
          <Action.CopyToClipboard title="Copy ID" content={id} />
        </ActionPanel>
      }
    />
  )
}

interface IPortalSearchResultRentalByIdProps {
  id: number;
  adminToken: string;
}

export function PortalSearchResultRentalById(props: IPortalSearchResultRentalByIdProps) {
  const { id, adminToken } = props;

  const viewListing = useCallback(async () => {
    showToast({
      title: 'Fetching rental',
      style: Toast.Style.Animated
    })

    try {
      const rental = await adminFetchRental(id, adminToken)
      
      await openUrlInDefaultBrowser(`${APP_URL}${rental.slug}`)
    } catch (error) {
      showFailureToast(error, {
        title: 'Error fetching rental'
      })
    }
  }, [id, adminToken])

  const impersonate = useCallback(async () => {
    showToast({
      title: 'Fetching rental',
      style: Toast.Style.Animated
    })

    try {
      const rental = await adminFetchRental(id, adminToken)
      
      await impersonateUser(rental.owner_id, adminToken, `${APP_URL}/dashboard/rentals/${id}`)
    } catch (error) {
      showFailureToast(error, {
        title: 'Error fetching rental'
      })
    }
  }, [id, adminToken])

  return (
    <List.Item
      title={`Rental ${id}`}
      accessories={[{ icon: Icon.Car }]}
      actions={
        <ActionPanel title="Rental Actions">
          <OpenInBrowserAction title="Open in Portal" url={`${PORTAL_URL}/rentals/${id}`} />
          <Action title="View Listing" icon={Icon.Globe} onAction={viewListing} />
          <Action title="Impersonate Owner" icon={Icon.Person} onAction={impersonate} />
          <Action.CopyToClipboard title="Copy ID" content={id} />
        </ActionPanel>
      }
    />
  )
}

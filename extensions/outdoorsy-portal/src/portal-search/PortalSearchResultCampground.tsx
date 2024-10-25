import { List, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { IAdminSearchResultCampground } from "../types";
import { makeCloudinaryTransformedImageUrl } from "../utils/cloudinary";
import { APP_URL, PORTAL_URL } from "../utils/consts";
import OpenInBrowserAction from "../common/OpenInBrowserAction";
import { showFailureToast } from "@raycast/utils";
import { useCallback } from "react";
import { adminFetchCampground, adminFetchRental } from "../utils/admin-data";
import { openUrlInDefaultBrowser } from "../utils/browser";

interface IPortalSearchResultCampgroundProps {
  campground: IAdminSearchResultCampground;
  adminToken: string;
}

export default function PortalSearchResultCampground(props: IPortalSearchResultCampgroundProps) {
  const { campground, adminToken } = props;
  const { id, name, primary_image_url, provider_type } = campground;

  const transformedImageUrl = makeCloudinaryTransformedImageUrl(primary_image_url, 50, 50);

  const viewListing = useCallback(async () => {
    showToast({
      title: 'Fetching campground',
      style: Toast.Style.Animated
    })

    try {
      const campground = await adminFetchCampground(id, adminToken)
      
      await openUrlInDefaultBrowser(`${APP_URL}${campground.slug}`)
    } catch (error) {
      showFailureToast(error, {
        title: 'Error fetching campground'
      })
    }
  }, [id, adminToken])

  return (
    <List.Item
      id={`${id}`}
      title={name}
      subtitle={`${provider_type}`}
      icon={transformedImageUrl}
      accessories={[{ icon: Icon.Tree }]}
      actions={
        <ActionPanel title="Campground Actions">
          <OpenInBrowserAction title="Open in Portal" url={`${PORTAL_URL}/campgrounds/${id}`} />
          <Action title="View Listing" icon={Icon.Globe} onAction={viewListing} />
          <Action.CopyToClipboard title="Copy ID" content={id} />
        </ActionPanel>
      }
    />
  )
}

interface IPortalSearchResultCampgroundByIdProps {
  id: number;
  adminToken: string;
}

export function PortalSearchResultCampgroundById(props: IPortalSearchResultCampgroundByIdProps) {
  const { id, adminToken } = props;

  const viewListing = useCallback(async () => {
    showToast({
      title: 'Fetching campground',
      style: Toast.Style.Animated
    })

    try {
      const campground = await adminFetchCampground(id, adminToken)
      
      await openUrlInDefaultBrowser(`${APP_URL}${campground.slug}`)
    } catch (error) {
      showFailureToast(error, {
        title: 'Error fetching campground'
      })
    }
  }, [id, adminToken])

  return (
    <List.Item
      title={`Campground ${id}`}
      accessories={[{ icon: Icon.Tree }]}
      actions={
        <ActionPanel title="Campground Actions">
          <OpenInBrowserAction title="Open in Portal" url={`${PORTAL_URL}/campgrounds/${id}`} />
          <Action title="View Listing" icon={Icon.Globe} onAction={viewListing} />
          <Action.CopyToClipboard title="Copy ID" content={id} />
        </ActionPanel>
      }
    />
  )
}

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { EAdminSearchType, IAdminSearchResponse } from "../types";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import PortalSearchResultUser, { PortalSearchResultUserById } from "./PortalSearchResultUser";
import PortalSearchTypeDropdown from "./PortalSearchTypeDropdown";
import PortalSearchResultRental, { PortalSearchResultRentalById } from "./PortalSearchResultRental";
import PortalSearchResultBooking, { PortalSearchResultBookingById } from "./PortalSearchResultBooking";
import PortalSearchResultCampground, { PortalSearchResultCampgroundById } from "./PortalSearchResultCampground";
import { API_URL } from "../utils/consts";

interface IPortalSearchProps {
  adminToken: string;
}

export default function PortalSearch(props: IPortalSearchProps) {
  const { adminToken } = props;

  const [searchText, setSearchText] = useState("");
  const [searchType, setSearchType] = useState<EAdminSearchType>(EAdminSearchType.User);
  const { data, isLoading } = useFetch<IAdminSearchResponse>(`${API_URL}/v0/admin/search?limit=20&offset=0&object_type=${searchType}&search_query=${searchText}`, { headers: { Admin: adminToken }})

  const searchID = parseInt(searchText);
  const searchTextIsID = !isNaN(searchID) && searchID > 0;
  
  return (
    <List
      searchBarPlaceholder="Admin portal search"
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<PortalSearchTypeDropdown onSearchTypeChange={setSearchType} />}
    >
      {searchTextIsID && (
          <List.Section title="By ID">
            <PortalSearchResultBookingById id={searchID} adminToken={adminToken} />
            <PortalSearchResultUserById id={searchID} adminToken={adminToken} />
            <PortalSearchResultRentalById id={searchID} adminToken={adminToken} />
            <PortalSearchResultCampgroundById id={searchID} adminToken={adminToken} />
          </List.Section>
      )}

      {data?.data && (
        <List.Section title="Results">
          {data.data.object_type === EAdminSearchType.User && (
            data.data.object_data.map((user) => (
              <PortalSearchResultUser key={user.id} user={user} adminToken={adminToken} />
            ))
          )}

          {data.data.object_type === EAdminSearchType.Rental && (
            data.data.object_data.map((rental) => (
              <PortalSearchResultRental key={rental.id} rental={rental} adminToken={adminToken} />
            ))
          )}

          {data.data.object_type === EAdminSearchType.Booking && (
            data.data.object_data.map((booking) => (
              <PortalSearchResultBooking key={booking.id} booking={booking} adminToken={adminToken} />
            ))
          )}

          {data.data.object_type === EAdminSearchType.Campground && (
            data.data.object_data.map((campground) => (
              <PortalSearchResultCampground key={campground.id} campground={campground} adminToken={adminToken} />
            ))
          )}
        </List.Section>
      )}
    </List>
  )
}

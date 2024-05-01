import { List } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { SuccessResponse, WantedPerson } from "./types";
import { API_HEADERS, BASE_API_URL, PAGE_SIZE } from "./constants";
import { generateMarkdown } from "./utils";

export default function WantedPersons() {
    const [total, setTotal] = useCachedState<number>("total-wanted");
    const { isLoading, data: persons, pagination } = useFetch(
        (options) =>
        BASE_API_URL + "@wanted?" +
          new URLSearchParams({ page: String(options.page + 1), pageSize: PAGE_SIZE.toString() }).toString(),
        {
        headers: API_HEADERS,
          mapResult(result: SuccessResponse<WantedPerson>) {
            if (!total) setTotal(result.total);
            const lastPage = Number((result.total / PAGE_SIZE).toFixed());
            return {
              data: result.items,
              hasMore: lastPage!==result.page,
            };
          },
          keepPreviousData: true,
          initialData: [],
        },
    );

    return <List isLoading={isLoading} pagination={pagination} isShowingDetail>
        <List.Section title={`${persons.length} of ${total} Wanted Persons`}>
        {persons.map(person => <List.Item key={person.uid} title={person.title} detail={<List.Item.Detail markdown={generateMarkdown(person)} metadata={<List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Title" text={person.title} />
        </List.Item.Detail.Metadata>} />} />)}
        </List.Section>
    </List>
}
import { List } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { SuccessResponse, WantedPerson } from "./types";
import { API_HEADERS, BASE_API_URL, PAGE_SIZE } from "./constants";
import { ItemWithTagsOrIcon, ItemWithTextOrIcon, generateMarkdown } from "./utils";
import ImagesMetadata from "./components/ImagesMetadata";

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
          <List.Item.Detail.Metadata.Label title="Description" text={person.description} />
          <List.Item.Detail.Metadata.TagList title="Sex">
            <List.Item.Detail.Metadata.TagList.Item text={person.sex} />
          </List.Item.Detail.Metadata.TagList>
          
          <ItemWithTextOrIcon title="Warning Message" text={person.warning_message} />
          <ItemWithTextOrIcon title="Remarks" text={person.remarks} />
          <ItemWithTextOrIcon title="Details" text={person.details} />
          <ItemWithTextOrIcon title="Additional Information" text={person.additional_information} />
          <ItemWithTextOrIcon title="Caution" text={person.caution} />
          <ItemWithTextOrIcon title="Reward Text" text={person.reward_text} />
          <ItemWithTextOrIcon title="Reward Min" text={person.reward_min ? person.reward_min.toString() : undefined} />
          <ItemWithTextOrIcon title="Reward Max" text={person.reward_max ? person.reward_max.toString() : undefined} />
          <ItemWithTagsOrIcon title="Dates of Birth Used" items={person.dates_of_birth_used} />
          <ItemWithTextOrIcon title="Place of Birth" text={person.place_of_birth} />
          <ItemWithTagsOrIcon title="Locations" items={person.locations} />
          <ItemWithTagsOrIcon title="Field Offices" items={person.field_offices} />
          <ItemWithTagsOrIcon title="Legal Names" items={person.legat_names} />
          <ItemWithTextOrIcon title="Status" text={person.status} />
          <ItemWithTextOrIcon title="Person Classification" text={person.person_classification} />
          <ItemWithTextOrIcon title="Poster Classification" text={person.poster_classification} />
          <ItemWithTextOrIcon title="ncic" text={person.ncic} />
          <ItemWithTextOrIcon title="Age" text={person.age_range} />
          <ItemWithTextOrIcon title="Weight" text={person.weight} />
          
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Files" />
          {person.files.map((file, fileIndex) => <List.Item.Detail.Metadata.Link key={fileIndex} title={file.name} text={file.url} target={file.url} />)}
          <ImagesMetadata images={person.images} />
        </List.Item.Detail.Metadata>} />} />)}
        </List.Section>
    </List>
}
import type { LaunchProps } from "@raycast/api";
import { PersonActions, personContent } from "./components/entities";
import SearchList from "./components/SearchList";
import { fetchPerson } from "./lib/api";
import { nomineeUrl, xProfile } from "./lib/inbox";
import type { PersonDetail, PersonResult } from "./lib/types";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchPeople }>) {
  return (
    <SearchList<PersonResult, PersonDetail>
      favoriteKind="people"
      recentsKey="people"
      tool="lookup_person"
      noun={["person", "people"]}
      initialQuery={props.arguments.query}
      placeholder="Search people by name or handle"
      emptyDescription="Type a name or handle, then press Enter."
      results={(raw: { items: PersonResult[] }) => raw.items}
      toItem={(p) => ({
        // Someone who isn't on Cosign has no nomineeId; their X handle ("@…") identifies them instead.
        id: p.nomineeId ?? p.handle,
        title: p.name,
        subtitle: p.handle,
        imageUrl: p.imageUrl ?? undefined,
        verified: p.onCosign,
        keywords: [p.handle],
        url: p.nomineeId ? nomineeUrl(p.nomineeId) : xProfile(p.handle).url,
      })}
      fetchDetail={(id) => fetchPerson(id.startsWith("@") ? { handle: id } : { nomineeId: id })}
      content={personContent}
      actions={(person) => <PersonActions person={person} />}
    />
  );
}

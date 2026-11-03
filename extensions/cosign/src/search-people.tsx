import { PersonActions, personContent } from "./components/entities";
import SearchList from "./components/SearchList";
import { fetchPerson } from "./lib/api";
import type { PersonDetail, PersonResult } from "./lib/types";

export default function Command() {
  return (
    <SearchList<PersonResult, PersonDetail>
      favoriteKind="people"
      recentsKey="people"
      tool="search_people"
      noun={["person", "people"]}
      placeholder="Search people by name or handle"
      emptyDescription="Type a name or handle, then press Enter."
      reason="User searched for people from the Raycast extension"
      toItem={(p) => ({
        id: p.nomineeId,
        title: p.name,
        subtitle: p.handle ?? undefined,
        imageUrl: p.imageUrl ?? undefined,
        verified: p.onCosign,
        keywords: p.handle ? [p.handle] : undefined,
        url: p.profileUrl,
      })}
      fetchDetail={(id) => fetchPerson({ nomineeId: id })}
      content={personContent}
      actions={(person) => <PersonActions person={person} />}
    />
  );
}

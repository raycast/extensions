import { listTopOfMind, TopOfMindUnavailableError } from "./api";
import { ObjectList } from "./components/ObjectList";

export default function SearchTopOfMindCommand() {
  return (
    <ObjectList
      searchBarPlaceholder="Search your Top of Mind…"
      emptyTitle="No Top of Mind Items"
      emptyDescription="Pin items to Top of Mind to see them here."
      errorTitle="Couldn't load Top of Mind"
      errorEmptyView={(error) =>
        error instanceof TopOfMindUnavailableError
          ? {
              title: "Top of Mind Unavailable",
              description: "The current mymind API doesn't expose a readable Top of Mind list.",
            }
          : undefined
      }
      loadObjects={({ query }) => listTopOfMind({ q: query })}
    />
  );
}

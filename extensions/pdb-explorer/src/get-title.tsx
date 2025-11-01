import { Detail, LaunchProps, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Protein {
  struct: {
    title: string;
  };
  rcsb_accession_info: {
    initial_release_date: string;
  };
  polymer_entities: Array<{
    rcsb_id: string;
    entity_poly?: {
      pdbx_strand_id?: string;
    };
    rcsb_polymer_entity?: {
      pdbx_description?: string;
    };
  }>;
  nonpolymer_entities: Array<{
    rcsb_id: string;
    nonpolymer_comp: {
      chem_comp: {
        id: string;
        name: string;
        formula: string;
      };
      rcsb_chem_comp_descriptor?: {
        InChIKey?: string;
      };
    };
  }>;
}

interface ProteinResponse {
  data?: {
    entries: Array<Protein>;
  };
}

interface ProteinArguments {
  id?: string;
}

const Actions = ({ pdbId, title }: { pdbId: string; title: string }): JSX.Element => {
  const pdbUrl = `https://www.rcsb.org/structure/${pdbId}`;

  return (
    <ActionPanel title={`PDB: ${pdbId}`}>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Pdb" url={pdbUrl} shortcut={{ modifiers: ["cmd"], key: "o" }} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <>
          <Action.CopyToClipboard content={pdbUrl} title="Copy Pdb URL" shortcut={{ modifiers: ["cmd"], key: "." }} />
          <Action.CopyToClipboard
            content={pdbId}
            title="Copy Pdb Id"
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
          <Action.CopyToClipboard
            content={title}
            title="Copy Pdb Title"
            shortcut={{ modifiers: ["cmd", "opt"], key: "." }}
          />
        </>
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default function Command(props: LaunchProps<{ arguments: ProteinArguments }>) {
  if (!props.arguments.id) {
    return <Detail markdown="Please provide a PDB ID" />;
  }

  const pdbId = props.arguments.id.trim().toUpperCase();
  const query = `
    query ($pdbId: String!) {
      entries(entry_ids: [$pdbId]) {
        struct {
          title
        }
        rcsb_accession_info {
          initial_release_date
        }
        polymer_entities {
          rcsb_id
          entity_poly {
            pdbx_strand_id
          }
          rcsb_polymer_entity {
            pdbx_description
          }
        }
        nonpolymer_entities {
          rcsb_id
          nonpolymer_comp {
            chem_comp {
              id
              name
              formula
            }
            rcsb_chem_comp_descriptor {
              InChIKey
            }
          }
        }
      }
    }
  `;

  const { isLoading, data, error } = useFetch<ProteinResponse>("https://data.rcsb.org/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { pdbId },
    }),
  });

  if (error) {
    return <Detail markdown={`Error: ${error.message}`} />;
  }

  const protein = data?.data?.entries?.[0];
  let markdown = "Loading...";

  if (!isLoading && protein) {
    markdown = `
# ${protein.struct.title}
Released: ${new Date(protein.rcsb_accession_info.initial_release_date).toLocaleDateString()}

## Polymer Entities
${(protein.polymer_entities || [])
  .map(
    (entity) =>
      `* ${entity.rcsb_id}: ${entity.rcsb_polymer_entity?.pdbx_description || "Unknown"} (Chain${
        entity.entity_poly?.pdbx_strand_id?.includes(",") ? "s" : ""
      } ${entity.entity_poly?.pdbx_strand_id || "N/A"})`
  )
  .join("\n")}

## Small Molecules / non-polymer entities
${
  !protein.nonpolymer_entities || protein.nonpolymer_entities.length === 0
    ? "No small molecule ligands present"
    : protein.nonpolymer_entities
        .map((entity) => {
          const chemComp = entity.nonpolymer_comp.chem_comp;
          const descriptor = entity.nonpolymer_comp.rcsb_chem_comp_descriptor;
          return `* ${chemComp.id}
  * Name: ${chemComp.name}
  * Formula: ${chemComp.formula}
  * InChI Key: ${descriptor?.InChIKey || "N/A"}`;
        })
        .join("\n")
}`;
  } else if (!isLoading && !protein) {
    markdown = "No data found";
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={protein ? <Actions pdbId={pdbId} title={protein.struct.title} /> : null}
    />
  );
}

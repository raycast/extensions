import fetch from "node-fetch";

async function QueryPlatform(input: string): Promise<any> {
  try {
    const response = await fetch(
      "https://api.platform.opentargets.org/api/v4/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
                query searchTerm($queryString: String!) {
                    search(queryString: $queryString){
                        hits {
                        id
                        name
                        entity
                        }
                    }
                }
                `,
          variables: {
            queryString: input,
          },
        }),
      }
    );
    const exam = await response.json();
    return exam;
  } catch (error) {
    console.error(error);
  }
}

async function renderPlatformData(input: string): Promise<any> {
  const apiResponse = await QueryPlatform(input);
  const hit = apiResponse.data.search.hits;
  return hit;
}

export async function runPlatform(input: string) {
  const data = await renderPlatformData(input);
  const result = data.map((item: any) => {
    const { id, name, entity } = item;

    const url = `https://platform.opentargets.org/${entity}/${id}/associations`;

    return { id, name, url, entity };
  });
  return result;
}

async function QueryGenetics(input: string): Promise<any> {
  try {
    const response = await fetch(
      "https://api.genetics.opentargets.org/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
                query searchTerm($queryString: String!) {
                    search(queryString: $queryString){
                      genes {
                        id
                        symbol
                      }
                      variants {
                        id
                      }
                      studies {
                        studyId
                        traitReported
                      }
                    }
                  }
                `,
          variables: {
            queryString: input,
          },
        }),
      }
    );
    const exam = await response.json();
    return exam;
  } catch (error) {
    console.error(error);
  }
}

async function renderGeneticsData(input: string): Promise<any> {
  const apiResponse = await QueryGenetics(input);
  const response = apiResponse.data.search;
  const entities = ["genes", "variants", "studies"];
  const data: any = [];
  entities.forEach(function (item) {
    if (response[item].length > 0) {
      // TODO: show more than 1 result per entity
      const id =
        item === "studies" ? response[item][0].studyId : response[item][0].id;
      const name =
        item === "genes"
          ? response[item][0].symbol
          : item === "variants"
          ? response[item][0].id
          : item === "studies"
          ? response[item][0].traitReported
          : "";
      const entity =
        item === "genes"
          ? "gene"
          : item === "variants"
          ? "variant"
          : item === "studies"
          ? "study"
          : "";
      const record = { id, name, entity };
      data.push(record);
    }
  });
  return data;
}

export async function runGenetics(input: string) {
  const data = await renderGeneticsData(input);
  const result = data.map((item: any) => {
    const { id, name, entity } = item;

    const url = `https://genetics.opentargets.org/${entity}/${id}`;

    return { id, name, url, entity };
  });
  return result;
}

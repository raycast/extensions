import { HookResponse, Standing } from "@src/types";
import useSportMonksClient from "@src/hooks/useSportMonksClient";

type Participant = {
  name: string;
  image_path: string;
};

type Form = {
  fixture: {
    name: string;
    result_info: string;
    starting_at_timestamp: number;
  };
  form: "W" | "D" | "L";
};

type SportMonksStandingResponse = {
  position: number;
  points: number;
  form: Form[];
  participant: Participant;
};

const MAX_FORM_FIXTURES = 4;

const useFetchStandings = (seasonId: string) => {
  const { data, isLoading, revalidate } = useSportMonksClient({
    method: "get",
    path: `/standings/seasons/${seasonId}?include=form.fixture;participant`,
  });

  const hookResponse: HookResponse<Standing, typeof revalidate> = {
    data: [],
    isLoading,
    error: null,
    revalidate,
  };

  if (data?.status === 401) {
    return { ...hookResponse, error: "Invalid API Token" };
  }

  const response: SportMonksStandingResponse[] = data?.data;

  const finalData: Standing[] =
    response?.map(({ participant, ...rest }) => {
      return {
        name: participant.name,
        img_path: participant.image_path,
        position: rest.position,
        points: rest.points,
        played: rest.form.length,
        wins: rest.form.filter(({ form }) => form === "W").length,
        losses: rest.form.filter(({ form }) => form === "L").length,
        draws: rest.form.filter(({ form }) => form === "D").length,
        recentForm: rest.form
          .sort((a, b) => {
            return (
              new Date(a.fixture.starting_at_timestamp).getTime() -
              new Date(b.fixture.starting_at_timestamp).getTime()
            );
          })
          .map(({ form, fixture }) => ({
            result: form,
            name: fixture.name,
          }))
          .reverse()
          .slice(0, MAX_FORM_FIXTURES),
      };
    }) ?? [];

  return { ...hookResponse, data: finalData };
};

export default useFetchStandings;

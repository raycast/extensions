import Fixtures from "@src/components/Fixtures";
import Squad from "@src/components/Squad";
import { Grid, List } from "@raycast/api";
import { Category, Team } from "@src/types";
import { useState, ComponentProps } from "react";
import { useErrorToast, useFetchFixtures } from "@src/hooks";

const MAX_LIST_SIZE = 6;
const MAX_GRID_SIZE = 50;

const TeamDetails = ({ team }: { team: Team }) => {
  const [category, setCategory] = useState<Category>(Category.All);
  const { data, isLoading, error } = useFetchFixtures(team.id, {
    result_info: true,
    starting_at: true,
  });

  const playedFixtureIndex = data?.findIndex((fixture) => fixture.result);
  const upcomingFixtures = data?.slice(0, playedFixtureIndex);
  const prevFixtures = data?.slice(playedFixtureIndex + 1);
  const upcomingProps: ComponentProps<typeof Fixtures> = {
    title: "Upcoming Matches",
    fixtures: upcomingFixtures,
  };
  const prevProps: ComponentProps<typeof Fixtures> = {
    title: "Previous Fixtures",
    fixtures: prevFixtures,
  };

  useErrorToast(error);

  if (
    category === Category.All ||
    category === Category.UpcomingMatches ||
    category === Category.PrevFixtures
  ) {
    return (
      <List
        throttle
        isLoading={isLoading}
        navigationTitle={`${team.name}`}
        searchBarPlaceholder={`Search within ${team.name}`}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Select Category"
            onChange={(newValue) => {
              setCategory(newValue as Category);
            }}
            value={category}
          >
            {Object.values(Category).map((category) => {
              return (
                <List.Dropdown.Item
                  title={category}
                  key={category}
                  value={category}
                />
              );
            })}
          </List.Dropdown>
        }
      >
        <>
          {category === Category.All && (
            <>
              <Fixtures {...upcomingProps} limit={MAX_LIST_SIZE} />
              <Fixtures {...prevProps} limit={MAX_LIST_SIZE} />
              <Squad type="list" team={team} limit={MAX_LIST_SIZE} />
            </>
          )}
          {category === Category.UpcomingMatches && (
            <Fixtures {...upcomingProps} limit={MAX_LIST_SIZE} />
          )}
          {category === Category.PrevFixtures && (
            <Fixtures {...prevProps} limit={MAX_LIST_SIZE} />
          )}
        </>
      </List>
    );
  }

  return (
    <Grid
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Category"
          onChange={(newValue) => {
            setCategory(newValue as Category);
          }}
          value={category}
        >
          {Object.values(Category).map((category) => {
            return (
              <Grid.Dropdown.Item
                title={category}
                key={category}
                value={category}
              />
            );
          })}
        </Grid.Dropdown>
      }
    >
      <Squad type="grid" team={team} limit={MAX_GRID_SIZE} />
    </Grid>
  );
};

export default TeamDetails;

import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import React from "react";
import { ProgramList } from "./components/ProgramList";
import { genreLabels, genreMajorCategories, GenreMajorCategory, genreMajorCategoryLabels } from "./types";

export default function Command() {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search Programs"
            onSubmit={(values) => {
              const selectedGenres = Object.entries(values)
                .filter(([, value]) => value)
                .map(([key]) => key);
              push(
                <ProgramList customFilters={[(p) => p.genres.some((g) => selectedGenres.includes(g))]} canSelectAll />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      {genreMajorCategories.map((majorCategory) => (
        <GenreDescriptionAndList key={majorCategory} majorCategory={majorCategory} />
      ))}
    </Form>
  );
}

function GenreDescriptionAndList({ majorCategory }: { majorCategory: GenreMajorCategory }) {
  return (
    <>
      <Form.Description text={genreMajorCategoryLabels[majorCategory]} />
      {Object.entries(genreLabels)
        .filter(([key]) => key.startsWith(majorCategory))
        .map(([key, label]) => (
          <Form.Checkbox key={key} id={key} label={label} defaultValue={false} storeValue />
        ))}
    </>
  );
}

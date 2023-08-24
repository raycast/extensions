import { Grid } from "@raycast/api";
import { FC, useEffect, useState } from "react";
import { Symbols } from "../..";
import { Dropdown } from "../molecules/dropdown";
import { ContextProps } from "../../hooks/preview";

export type Props = {
  children: React.ReactNode;
  context: ContextProps;
};

export const Root: FC<Props> = ({ children, context }) => {
  const [selection, setSelection] = useState<Symbols | null>();

  const selectedItemId: Symbols = "clean";

  useEffect(() => {
    // if (selection) context.onAction(selection);
  }, [selection]);

  return (
    <Grid
      columns={7}
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Large}
      selectedItemId={selectedItemId}
      onSelectionChange={(i) => setSelection(i as Symbols)}
      searchBarAccessory={<Dropdown context={context} />}
    >
      {children}
    </Grid>
  );
};

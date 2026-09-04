# A Source's Name and Dock Item Name derive from its Application

Setting up a Source required four fields — Name, Application, Dock Item Name, Open Command — yet Name and Dock Item Name were almost always derivable from the chosen Application. We decided Add is an Application picker plus an optional Open Command override: a Source's Name and Dock Item Name derive from the Application's bundle filename (minus `.app`) and are never user-editable. Application is required, so the existing rule "Dock Item Name unique across the Source Catalog" now reads as one Source per Application.

## Considered Options

- Keeping Dock Item Name user-correctable as an advanced escape hatch — rejected: it reintroduces the field this change removes.
- Slimming the stored schema to derive Name and Dock Item Name at read time — rejected: a version bump, a reseed, and menu changes for zero user-visible gain; stored snapshots keep every existing row working unchanged.

## Consequences

- The stored schema is unchanged and the version stays 1: nothing migrates. Existing rows keep working as-is — including app-less rows and hand-set Dock Item Names, which remain valid but can no longer be produced by the form.
- A Dock tile whose title diverges from the Application's bundle filename leaves that Source permanently Not Available with no in-app remedy; this dead-end is accepted.
- The seed row is expressed as an Application plus derived fields, with no explicit Open Command.

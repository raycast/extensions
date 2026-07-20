# SAP GUI Connector

Quickly connect to SAP systems with your saved credentials.

This extension requires an installed SAP GUI for Java installation.

## Organizing systems

Each system is stored with a **customer name** and a **system type**:

- **E** – Development
- **Q** – Quality
- **P** – Production
- **S** – Other

This way several customers can share the same SAP System ID (e.g. multiple
`PRD` systems) without clashing, and the list, search, and menu bar are grouped
by customer.

## Language

A system can store a fixed logon language, or be set to **"Ask on connect"**.
When no language is stored, you pick one from a submenu when connecting (list
and menu bar); the direct "Connect to SAP System" command falls back to the SAP
GUI's own language prompt.

![screnshot](./media/add-new-system.png)
![screnshot](./media/list-system.png)

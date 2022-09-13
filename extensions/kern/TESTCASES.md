Couldn't find a way to automatically test the application. Here are some manual tests.

| ID  | Name          | Preconditions      | Steps            | Result                                                                                                             |
| --- | ------------- | ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Start Session | -                  | Start a session. | 1. HUD should be displayed. 2. OS notification should be displayed. 3. A entry in session list should exist.       |
| 2   | Stop Session  | A running session. | Start a session. | 1. OS notification should be displayed. 2. After the actual session duration a OS notification is _not_ displayed. |

# Architecture

## C4 Level 1: System Context

The user interacts with Glean Search through Raycast. The extension delegates all search and authentication to the Glean CLI, which communicates with the Glean cloud API.

```mermaid
flowchart TB
    User["User<br/>Raycast user"]
    System["Glean Search<br/>Raycast Extension"]
    GleanAPI["Glean Cloud API<br/>Search + Auth endpoints"]
    CLI_Source["GitHub Releases<br/>glean-cli binary"]
    Browser["Browser<br/>OAuth provider"]
    Keychain["macOS Keychain<br/>Token storage"]

    User -->|"types query<br/>clicks sign in"| System
    System -->|"glean search<br/>glean auth"| GleanAPI
    System -->|"auto-downloads"| CLI_Source
    System -->|"opens OAuth URL"| Browser
    Browser -->|"OAuth callback"| System
    System -->|"stores/reads tokens"| Keychain

    style System fill:#5e81ac,stroke:#2e3440,color:#fff
    style User fill:#88c0d0,stroke:#2e3440,color:#2e3440
```

| Element | Description |
|---------|-------------|
| **User** | A person searching their company's knowledge base via Raycast |
| **Glean Search** | The Raycast extension (this project). Auto-downloads CLI, manages auth, executes search |
| **Glean Cloud API** | The Glean backend providing search and OAuth endpoints |
| **GitHub Releases** | Source of the pre-built `glean-cli` binary, verified via SHA-256 |
| **Browser** | OAuth 2.0 + PKCE flow opened in the user's default browser |
| **macOS Keychain** | Secure credential storage used by the Glean CLI |

---

## C4 Level 2: Container Diagram

The extension is a single Raycast command with four internal modules that orchestrate the Glean CLI.

```mermaid
flowchart TB
    subgraph Raycast["Raycast Runtime"]
        Command["search-glean.tsx<br/>React Component<br/>(UI + state)"]
    end

    subgraph Modules["Extension Modules"]
        Hook["glean.ts<br/>useGlean hook<br/>(orchestrator)"]
        Auth["auth.ts<br/>Auth manager<br/>(OAuth + status)"]
        CLI["cli.ts<br/>Binary manager<br/>(discovery + download)"]
        Types["types.ts<br/>Shared types<br/>(interfaces)"]
    end

    subgraph External["External Dependencies"]
        GleanCLI["glean CLI<br/>/usr/local/bin/glean<br/>or auto-downloaded"]
        GitHub["github.com/gleanwork<br/>glean-cli releases"]
        GleanAPI["Glean Cloud API"]
        Config["~/.glean/config.json<br/>Server URL cache"]
        Keychain["macOS Keychain<br/>OAuth tokens"]
    end

    Command -->|"useGlean()"| Hook
    Hook -->|"resolveGleanCli()"| CLI
    Hook -->|"checkGleanAuth()<br/>signInToGlean()"| Auth
    Hook -->|"search(query)"| GleanCLI
    CLI -->|"download"| GitHub
    CLI -->|"verify SHA-256"| GitHub
    Auth -->|"glean auth status"| GleanCLI
    Auth -->|"glean auth login"| GleanCLI
    GleanCLI -->|"HTTP"| GleanAPI
    GleanCLI -->|"read/write"| Config
    GleanCLI -->|"read/write"| Keychain

    style Raycast fill:#3b4252,stroke:#81a1c1,color:#e5e9f0
    style Modules fill:#434c5e,stroke:#88c0d0,color:#e5e9f0
    style External fill:#2e3440,stroke:#4c566a,color:#d8dee9
```

| Container | Technology | Responsibility |
|-----------|-----------|----------------|
| **search-glean.tsx** | React (Raycast SDK) | Single command view. Renders search results, auth forms, error/loading states |
| **glean.ts** | TypeScript + React hooks | Orchestrates lifecycle: CLI discovery, auth checking, search execution |
| **auth.ts** | TypeScript + child_process | Reads `config.json`, runs `glean auth status/login`, parses output |
| **cli.ts** | TypeScript + https + child_process | Binary discovery chain, auto-download with SHA-256, caching |
| **types.ts** | TypeScript | `GleanResult`, `GleanSearchResponse`, `AuthInfo`, `GleanSnippet`, `GleanDocument` |

---

## C4 Level 3: Component Diagram

### search-glean.tsx — UI States

```mermaid
stateDiagram-v2
    [*] --> Initializing: mount
    Initializing --> CLI_Not_Found: resolveGleanCli() fails
    Initializing --> Unauthenticated: CLI found, no session

    Unauthenticated --> Email_Form: needsEmail === true
    Unauthenticated --> Sign_In_Button: server URL known

    Email_Form --> Signing_In: submit email
    Sign_In_Button --> Signing_In: click sign in

    Signing_In --> Search_UI: OAuth success
    Signing_In --> Unauthenticated: failure (retryable)
    Signing_In --> Email_Form: needs email

    CLI_Not_Found --> Initializing: retryCliDiscovery()
    CLI_Not_Found --> Search_UI: auto-download succeeds

    Search_UI --> [*]: unmount
```

### glean.ts — Hook Lifecycle

```mermaid
flowchart LR
    subgraph Mount["On Mount"]
        A["resolveGleanCli()"] --> B{"binary found?"}
        B -->|"yes"| C["checkGleanAuth()"]
        B -->|"no"| D["show CLI not found"]
        C --> E{"authed?"}
        E -->|"yes"| F["show search UI"]
        E -->|"no"| G{"needsEmail?"}
        G -->|"yes"| H["show email form"]
        G -->|"no"| I["show sign in button"]
    end

    subgraph SignIn["On Sign In"]
        J["signInToGlean(path, email?)"]
        J --> K{"GLEAN_SERVER_URL set?"}
        K -->|"yes"| L["spawn with stdin closed"]
        K -->|"no, email provided"| M["pipe email to stdin"]
        L --> N["extract OAuth URL from output"]
        M --> N
        N --> O["open() via Raycast API"]
        O --> P["wait for CLI exit code 0"]
        P -->|"success"| Q["recheckAuth()"]
        P -->|"failure: reading email"| R["toggle needsEmail"]
    end

    subgraph Search["On Search"]
        S["AbortController.abort() prev"]
        T["search(query, signal)"]
        T --> U["execFile(\"glean search\")"]
        U --> V["parse JSON response"]
        V --> W["setResults(items)"]
    end
```

### cli.ts — Binary Discovery Chain

```mermaid
flowchart TB
    Start["resolveGleanCli()"] --> Cache["read cli-info.json"]
    Cache --> Cached{"path exists<br/>and executable?"}
    Cached -->|"yes"| Return["return cached path"]
    Cached -->|"no"| Download["check cached download"]
    Download --> Downloaded{"binary exists?"}
    Downloaded -->|"yes"| Return
    Downloaded -->|"no"| Homebrew["check /opt/homebrew/bin/glean<br/>/usr/local/bin/glean"]
    Homebrew --> BrewFound{"found?"}
    BrewFound -->|"yes"| Return
    BrewFound -->|"no"| Which["which glean"]
    Which --> WhichFound{"found?"}
    WhichFound -->|"yes"| Return
    WhichFound -->|"no"| GitHub["fetch latest release<br/>from GitHub API"]
    GitHub --> Checksum["fetch checksums.txt"]
    Checksum --> Verify["download + SHA-256 verify"]
    Verify --> Extract["extract tar.gz"]
    Extract --> Cache["write cli-info.json"]
    Cache --> Return
    Verify -->|"failure"| Fail["markDownloadFailed()"]
    Fail --> Path["check PATH again"]
    Path --> Return
    Return -->|"null"| UI["show CLI not found UI"]

    style Return fill:#1e3a2f,stroke:#2ecc71,color:#e0e0e0
    style Fail fill:#3a1e1e,stroke:#e74c3c,color:#e0e0e0
```

---

## Data Flow

### Search Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as search-glean.tsx
    participant Hook as useGlean
    participant CLI as glean CLI
    participant API as Glean API

    User->>UI: type query
    UI->>Hook: search(query, signal)
    Hook->>CLI: execFile("glean search", [query])
    CLI->>API: HTTP request
    API-->>CLI: JSON results
    CLI-->>Hook: stdout
    Hook-->>UI: GleanResult[]
    UI-->>User: render list
```

### Authentication Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as search-glean.tsx
    participant Auth as auth.ts
    participant CLI as glean CLI
    participant Config as ~/.glean/config.json
    participant Browser
    participant Keychain

    alt Server URL cached
        Config-->>Auth: server_url found
        Auth->>CLI: spawn with GLEAN_SERVER_URL
        Note over CLI: skips email prompt
    else First time
        User-->>Auth: enter email
        Auth->>CLI: pipe email to stdin
        CLI->>Config: save server_url
    end

    CLI->>Browser: open OAuth URL
    User->>Browser: authenticate
    Browser-->>CLI: OAuth callback
    CLI->>Keychain: store token
    CLI-->>Auth: exit 0
    Auth-->>UI: authenticated
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **CLI delegation** over library integration | Official Glean client -- reduced maintenance, guaranteed API compatibility |
| **Auto-download** over bundling | Smaller package, independent version updates, SHA-256 verified |
| **React hooks** for state management | Stable API surface via `useCallback`, no unnecessary re-renders |
| **AbortController** for search | Prevents stale results on fast typing, clean cancellation |
| **spawn over execFile** for auth | Real-time stdout capture for OAuth URL extraction, stdin control |
| **Config file over preference** | `~/.glean/config.json` persists across extension re-installs |

<sub>Not affiliated with Glean. Glean is a trademark of Glean Technologies, Inc.</sub>

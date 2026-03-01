# next-lens

Raycast extension for [next-lens](https://next-lens.1wei.dev/) — a Next.js App Router tool that scans your project and instantly lists API routes and page routes in the terminal, web UI, and MCP.

## Setup

1. Install the next-lens extension in Raycast.
2. In your Next.js project root, run:

```bash
npx next-lens@latest raycast
```

This command starts the `next-lens` CLI integration and opens the next-lens command in Raycast.

## Usage

Once connected, you can browse your project routes directly in Raycast:

- View API and page routes
- Filter by HTTP method
- Open routes/files in your IDE
- Quickly jump to the route you need without leaving Raycast

## Notes

- This extension requires the `next-lens` CLI integration (`npx next-lens@latest raycast`) to be running in your project.
- If Raycast can’t find your routes, rerun the command from the correct project directory (the one containing your Next.js app).

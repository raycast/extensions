import { WorldsGate } from "./components/worlds-gate"
import { WorldSearch } from "./views/world-search"

export default function Command() {
  return (
    <WorldsGate>
      {(connection, worlds) => (
        <WorldSearch connection={connection} worlds={worlds} />
      )}
    </WorldsGate>
  )
}

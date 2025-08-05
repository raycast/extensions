import { CityListView } from "./components/CityListView"
import { FavoritesProvider } from "./components/FavoritesProvider"

export default function Command() {
    return (
        <FavoritesProvider>
            <CityListView />
        </FavoritesProvider>
    )
}

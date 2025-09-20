import { LocalStorage, showToast, Toast } from "@raycast/api"
import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { CityItem } from "../../types/CityItem"
import { countryList } from "../ressources/countryList"

interface FavoritesContextProps {
    favorites: CityItem[]
    addToFavorites: (cityInfo: CityItem) => Promise<void>
    removeFromFavorites: (cityInfo: CityItem) => Promise<void>
    moveFavorite: (cityInfo: CityItem, direction: "up" | "down") => Promise<void>
}

interface FavoritesProviderProps {
    children?: ReactNode
}

const initialFavoritesContext: FavoritesContextProps = {
    favorites: [],
    addToFavorites: () => new Promise(() => Promise),
    removeFromFavorites: () => new Promise(() => Promise),
    moveFavorite: () => new Promise(() => Promise),
}

const FavoritesContext = createContext<FavoritesContextProps>(initialFavoritesContext)

export const FavoritesProvider = ({ children }: FavoritesProviderProps) => {
    const [favorites, setFavorites] = useState<CityItem[]>(initialFavoritesContext.favorites)

    useEffect(() => {
        async function getFavorites() {
            const favorites = await LocalStorage.getItem("favorites")
            if (favorites) {
                setFavorites(JSON.parse(favorites.toString()))
            }
        }

        getFavorites()
    }, [])

    useEffect(() => {
        async function setFavorites() {
            if (favorites) {
                if (favorites.length === 0) {
                    await LocalStorage.removeItem("favorites")
                } else {
                    await LocalStorage.setItem("favorites", JSON.stringify(favorites))
                }
            }
        }

        setFavorites()
    }, [favorites])

    async function addToFavorites(cityInfo: CityItem): Promise<void> {
        if (favorites.some((favorite: CityItem) => favorite.geonameId === cityInfo.geonameId)) {
            await showToast({
                style: Toast.Style.Failure,
                title: `${countryList[cityInfo.countryCode].flag} ${cityInfo.name} is already in your favorites`,
            })
        } else {
            const newFavorites = [...favorites, cityInfo]
            setFavorites(newFavorites)
            await showToast({
                style: Toast.Style.Success,
                title: `${countryList[cityInfo.countryCode].flag} ${cityInfo.name} was add to your favorites`,
            })
        }
    }

    async function removeFromFavorites(cityInfo: CityItem): Promise<void> {
        if (favorites.some((favorite: CityItem) => favorite.geonameId === cityInfo.geonameId)) {
            const newFavorites = favorites.filter((favorite: CityItem) => favorite.geonameId !== cityInfo.geonameId)
            setFavorites(newFavorites)
            await showToast({
                style: Toast.Style.Success,
                title: `${countryList[cityInfo.countryCode].flag} ${cityInfo.name} was removed from your favorites`,
            })
        }
    }

    async function moveFavorite(cityInfo: CityItem, direction: "up" | "down"): Promise<void> {
        const newFavorites = [...favorites]
        const index = newFavorites.findIndex((favorite) => favorite.geonameId === cityInfo.geonameId)

        if (direction === "up") {
            if (index === 0) {
                await showToast({
                    style: Toast.Style.Failure,
                    title: `${countryList[cityInfo.countryCode].flag} ${
                        cityInfo.name
                    } is already at the top of your favorites`,
                })
            } else {
                const temp = newFavorites[index - 1]
                newFavorites[index - 1] = newFavorites[index]
                newFavorites[index] = temp
            }
        }

        if (direction === "down") {
            if (index === newFavorites.length - 1) {
                await showToast({
                    style: Toast.Style.Failure,
                    title: `${countryList[cityInfo.countryCode].flag} ${
                        cityInfo.name
                    } is already at the bottom of your favorites`,
                })
            } else {
                const temp = newFavorites[index + 1]
                newFavorites[index + 1] = newFavorites[index]
                newFavorites[index] = temp
            }
        }

        setFavorites(newFavorites)
    }

    return (
        <FavoritesContext.Provider value={{ favorites, addToFavorites, removeFromFavorites, moveFavorite }}>
            {children}
        </FavoritesContext.Provider>
    )
}

export const useFavorites = () => {
    const context = useContext(FavoritesContext)
    if (!context) {
        throw new Error("useFavorites must be used within a FavoritesProvider")
    }
    return context
}

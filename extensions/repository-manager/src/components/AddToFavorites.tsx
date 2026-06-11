import { Action, Icon } from '@raycast/api'
import { showSuccessToast, showErrorToast } from '../ui/toast'
import { getFavoriteProjects, setFavoriteProjects } from '../helpers'
import { Project } from '../project'

type AddToFavoritesProps = {
    project: Project
    onFavoriteChange: () => void
}

export default function AddToFavorites({ project, onFavoriteChange }: AddToFavoritesProps) {
    async function addProjectToFavorites() {
        const favorites = await getFavoriteProjects()
        const favoritesWithoutLegacyName = favorites.filter((favorite) => favorite !== project.name)
        await setFavoriteProjects([...favoritesWithoutLegacyName, project.fullPath])

        onFavoriteChange()
    }

    async function removeProjectFromFavorites() {
        const favorites = await getFavoriteProjects()

        const newFavorites = favorites.filter((value) => value !== project.fullPath && value !== project.name)
        await setFavoriteProjects(newFavorites)

        onFavoriteChange()
    }

    async function toggleFavorite() {
        try {
            if (project.isFavorite) {
                await removeProjectFromFavorites()
                await showSuccessToast('Removed from favorites')
            } else {
                await addProjectToFavorites()
                await showSuccessToast('Added to favorites')
            }
        } catch (error) {
            console.error('Favorite toggle error:', error)
            const message = project.isFavorite ? 'Failed to remove from favorites' : 'Failed to add to favorites'
            await showErrorToast(message)
        }
    }

    return (
        <Action
            title={project.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            key="add-to-favorites"
            icon={project.isFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'f' }}
            onAction={toggleFavorite}
        />
    )
}

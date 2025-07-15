import { Action, Icon, LocalStorage } from '@raycast/api'
import { showSuccessToast, showErrorToast } from '../ui/toast'
import { getFavoriteProjects } from '../helpers'
import { Project } from '../project'

type AddToFavoritesProps = {
    project: Project
    onFavoriteChange: () => void
}

export default function AddToFavorites({ project, onFavoriteChange }: AddToFavoritesProps) {
    async function addProjectToFavorites() {
        const favorites = await getFavoriteProjects()

        if (favorites) {
            const newFavorites = [...favorites, project.name].filter((value, index, self) => self.indexOf(value) === index)
            await LocalStorage.setItem('favorites', JSON.stringify(newFavorites))
        } else {
            await LocalStorage.setItem('favorites', JSON.stringify([project.name]))
        }

        onFavoriteChange()
    }

    async function removeProjectFromFavorites() {
        const favorites = await getFavoriteProjects()

        if (favorites) {
            const newFavorites = favorites.filter((value) => value !== project.name)
            await LocalStorage.setItem('favorites', JSON.stringify(newFavorites))
        }

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

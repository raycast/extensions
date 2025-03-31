import { Action, Icon, LocalStorage } from '@raycast/api'
import { withToast } from '../ui/toast'
import { getFavoriteProjects } from '../helpers'
import { Project } from '../project'

type AddToFavoritesProps = {
    project: Project
    onFavoriteChange: (project: Project) => void
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

        onFavoriteChange(project)
    }

    async function removeProjectFromFavorites() {
        const favorites = await getFavoriteProjects()

        if (favorites) {
            const newFavorites = favorites.filter((value) => value !== project.name)
            await LocalStorage.setItem('favorites', JSON.stringify(newFavorites))
        }

        onFavoriteChange(project)
    }

    async function toggleFavorite() {
        if (project.isFavorite) {
            await removeProjectFromFavorites()
        } else {
            await addProjectToFavorites()
        }
    }

    return (
        <Action
            title={project.isFavorite ? 'Remove From Favorites' : 'Add to Favorites'}
            key="add-to-favorites"
            icon={project.isFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'f' }}
            onAction={withToast({
                action: toggleFavorite,
                onSuccess: () => (project.isFavorite ? 'Removed from favorites' : 'Added to favorites'),
                onFailure: () => (project.isFavorite ? 'Failed to remove from favorites' : 'Failed to add to favorites'),
            })}
        />
    )
}

import { MenuBarExtra, Icon, showToast, Toast } from '@raycast/api';
import NotificationService from 'services/Notification';
import { NotificationInterface } from 'interfaces/notification';
import { useState, useEffect } from 'react';

// test
const NotificationItem: React.FC<{ notification: NotificationInterface }> = ({
	notification,
}: {
	notification: NotificationInterface;
}): JSX.Element => (
	<MenuBarExtra.Submenu
		title={`${notification.type.label.charAt(0).toUpperCase() + notification.type.label.slice(1)} ${notification.source.icon}`}
		icon={`icons/status/${notification.type}.png`}>
		<MenuBarExtra.Item
			title={notification.description}
			onAction={(): Promise<void> => handleNotificationClick(notification)}
		/>
	</MenuBarExtra.Submenu>
);

const handleNotificationClick: (
	notification: NotificationInterface
) => Promise<void> = async (notification: NotificationInterface): Promise<void> => {
	try {
		await NotificationService.handleNotificationClick(notification);
	} catch (error: unknown) {
		await showToast({
			style: Toast.Style.Failure,
			title: 'Failed to handle notification',
			message: error instanceof Error ? error.message : 'Unknown error occurred',
		});
	}
};

function Command(): JSX.Element {
	const [notifications, setNotifications] = useState<NotificationInterface[]>([]);
	const [title, setTitle] = useState<string>('');
	const [iconColor, setIconColor] = useState<string>('default');

	useEffect((): void => {
		const fetchData = async (): Promise<void> => {
			const fetchedNotifications: NotificationInterface[] =
				await NotificationService.getAllNotifications();
			setNotifications(fetchedNotifications);
			setTitle(await NotificationService.getTitle());
			setIconColor(await NotificationService.getIconColor());
		};
		fetchData();
	}, []);

	return (
		<MenuBarExtra
			icon={`icons/status/${iconColor}.svg`}
			title={title}>
			<MenuBarExtra.Section title='Notifications'>
				{notifications.length > 10 &&
					notifications.map(
						(notification: NotificationInterface): JSX.Element => (
							<NotificationItem
								key={notification.timestamp.toString()}
								notification={notification}
							/>
						)
					)}
			</MenuBarExtra.Section>
			<MenuBarExtra.Section title='Colors'>
				<MenuBarExtra.Submenu
					title='Palette'
					icon='other/palette.png'>
					{['Red', 'Green', 'Blue'].map(
						(color: string): JSX.Element => (
							<MenuBarExtra.Item
								key={color}
								title={color}
								icon={Icon.Circle}
							/>
						)
					)}
				</MenuBarExtra.Submenu>
			</MenuBarExtra.Section>
		</MenuBarExtra>
	);
}

export default Command;

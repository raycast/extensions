import NotificationService from 'services/Notification';
import {NotificationInterface} from 'models/Notification';
import {mockNotifications} from 'mocks/notification';

jest.mock('utils/notification/Sorter');
jest.mock('utils/notification/Formatter');
jest.mock('utils/notification/Handler');
jest.mock('providers/Slack');
jest.mock('providers/Email');

describe('NotificationService', () => {
	it('should get all notifications', async () => {
		jest
			.spyOn(NotificationService['providers'][0], 'getNotifications')
			.mockResolvedValue(mockNotifications);
		jest
			.spyOn(NotificationService['providers'][1], 'getNotifications')
			.mockResolvedValue([]);

		const result = await NotificationService.getAllNotifications();
		expect(result).toEqual(mockNotifications);
	});

	it('should get title', async () => {
		const mockTitle = 'Mock Title';
		jest
			.spyOn(NotificationService['formatter'], 'formatTitle')
			.mockReturnValue(mockTitle);

		const result = await NotificationService.getTitle();
		expect(result).toBe(mockTitle);
	});

	it('should get icon color', async () => {
		const mockColor = 'red';
		jest
			.spyOn(NotificationService['formatter'], 'getIconColor')
			.mockReturnValue(mockColor);

		const result = await NotificationService.getIconColor();
		expect(result).toBe(mockColor);
	});

	it('should get notifications with icons', async () => {
		const mockNotifications: NotificationInterface[] = [
			// Add mock notifications here
		];

		jest
			.spyOn(NotificationService, 'getAllNotifications')
			.mockResolvedValue(mockNotifications);
		jest
			.spyOn(NotificationService['sorter'], 'sortByPriority')
			.mockReturnValue(mockNotifications);

		const result = await NotificationService.getNotificationsWithIcons();
		expect(result).toEqual(mockNotifications);
	});
});

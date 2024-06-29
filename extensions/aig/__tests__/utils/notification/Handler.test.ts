import NotificationHandler from 'utils/notification/Handler';
import {mockNotifications} from 'tests/mocks/notification';

describe('NotificationHandler', () => {
	let handler: NotificationHandler;

	beforeEach(() => {
		handler = new NotificationHandler();
		console.log = jest.fn();
	});

	it('should handle click on notification', async () => {
		await handler.handleClick(mockNotifications[0]);
		expect(console.log).toHaveBeenCalledWith(
			'Notification clicked:',
			mockNotifications[0]
		);
	});
});

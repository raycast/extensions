import NotificationModel, {
	NotificationInterface,
	NotificationFormatter,
} from 'models/Notification';

describe('NotificationFormatter', () => {
	let formatter: NotificationFormatter;

	beforeEach(() => {
		formatter = new NotificationFormatter();
	});

	it('should format title correctly', () => {
		const notifications: NotificationInterface[] = [
			{
				title: 'Test1',
				type: NotificationModel.typeInfo,
				source: NotificationModel.sourceSlack,
			} as NotificationInterface,
			{
				title: 'Test2',
				type: NotificationModel.typeInfo,
				source: NotificationModel.sourceEmail,
			} as NotificationInterface,
		];

		const formattedTitle = formatter.formatTitle(notifications);
		expect(formattedTitle).toBe('Test1💬 Test2📬');
	});

	it('should get correct icon color', () => {
		const notifications: NotificationInterface[] = [
			{type: NotificationModel.typeInfo} as NotificationInterface,
			{type: NotificationModel.typeWarning} as NotificationInterface,
		];

		const iconColor = formatter.getIconColor(notifications);
		expect(iconColor).toBe('warning');
	});
});

import NotificationModel, {
	NotificationInterface,
	NotificationSorter,
} from 'models/Notification';

describe('NotificationSorter', () => {
	let sorter: NotificationSorter;

	beforeEach(() => {
		sorter = new NotificationSorter();
	});

	it('should sort notifications by priority', () => {
		const notifications: NotificationInterface[] = [
			{
				type: NotificationModel.typeInfo /* other required fields */,
			} as NotificationInterface,
			{
				type: NotificationModel.typeWarning /* other required fields */,
			} as NotificationInterface,
			{
				type: NotificationModel.typeDanger /* other required fields */,
			} as NotificationInterface,
			{
				type: NotificationModel.typeSuccess /* other required fields */,
			} as NotificationInterface,
		];

		const sorted = sorter.sortByPriority(notifications);

		expect(sorted[0].type).toBe(NotificationModel.typeDanger);
		expect(sorted[1].type).toBe(NotificationModel.typeWarning);
		expect(sorted[2].type).toBe(NotificationModel.typeInfo);
		expect(sorted[3].type).toBe(NotificationModel.typeSuccess);
	});
});

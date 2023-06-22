import { processText } from './processText';

const t = (i: string, o: string) => {
  expect(processText(i)).toEqual(o);
  // The result should not change after 2nd run
  expect(processText(processText(i))).toEqual(o);
};

describe('processText', () => {
  it('should add space between CJK and digit characters', () => {
    t('你好123こんにちは123안녕하세요123', '你好 123 こんにちは 123 안녕하세요 123');
  });

  it('should add space between digit and CJK characters', () => {
    t('123你好123123こんにちは123123안녕하세요123123', '123 你好 123123 こんにちは 123123 안녕하세요 123123');
  });

  it('should add space between digit and Letter characters', () => {
    t('123abc', '123 abc');
  });

  it('should add space between CJK and Letter characters', () => {
    t('你好HelloこんにちはHello안녕하세요Hello', '你好 Hello こんにちは Hello 안녕하세요 Hello');
    t('Hello你好HelloこんにちはHello안녕하세요Hello', 'Hello 你好 Hello こんにちは Hello 안녕하세요 Hello');
  });

  it('should remove space between CJK characters', () => {
    t(
      'Hello你    好Hello   こ  ん  に  ち  はHello안  녕  하  세  요Hello',
      'Hello 你好 Hello こんにちは Hello 안녕하세요 Hello'
    );
  });

  it('should handle underscore', () => {
    t('Hello_Tim', 'Hello_Tim');
  });

  it('should handle space after punctuation', () => {
    t('Hello,Tim. ', 'Hello, Tim. ');
    t('Hello,  Tim.', 'Hello, Tim.');
    t('Hello,Tim.', 'Hello, Tim.');
  });

  it('should add space between digit and unit characters', () => {
    t('12.3% 45.6Gbps', '12.3% 45.6 Gbps');
  });

  it('should handle brackets around text', () => {
    t('(苹果)', '（苹果）');
    t('(苹果Apple)', '（苹果 Apple）');
    t('(Apple)', '(Apple)');
    t(`"苹果Apple"`, `“苹果 Apple”`);
  });

  it('should handle book titles', () => {
    t(
      '《Hackers＆Painters：Big Ideas from the Computer Age》',
      '《Hackers & Painters: Big Ideas from the Computer Age》'
    );
    t('《你好 , 世界》', '《你好，世界》');
  });

  it('should handle full-width punctuations', () => {
    // Take advantage of `《` and `》` to force turn their CJK-free content into half-width
    t('《－～＿｜［］｛｝＜＞＄％＾＊＋＝＠＃｀＼／》', '《-~_|[]{}<>$%^*+=@#`\\/》');
  });

  it('should handle full-width digits', () => {
    t('０１２３４５６７８９', '0123456789');
  });

  it('should handle punctuations', () => {
    // t('你好,Tim', '你好，Tim')
    // t('你好 ,Tim', '你好，Tim')
    // t('你好 , Tim', '你好，Tim')
    t('《书》.', '《书》。');
  });

  it('should handle line break and indentation', () => {
    t(
      `
      你好
          Hello
    `,
      `
      你好
          Hello
    `
    );
  });

  it('should handle the `&` symbol', () => {
    t('a&b', 'a & b');
    t('a&&b', 'a && b');
  });

  it('should handle complex real world cases', () => {
    // a paragraph from news paper
    const cases = [
      [
        `今天,我和Mike 出去买菜花了 5000元，还买了两本书，一本是《资治通鉴》，另一本是《Vision，the key to the future》.`,
        `今天，我和 Mike 出去买菜花了 5000 元，还买了两本书，一本是《资治通鉴》，另一本是《Vision, the key to the future》。`,
      ],
      [
        `
        本报讯(记者 陈鹏)昨天,记者从市交通委获悉，为进一步提升市民出行体验，我市将于2021年6月30日起，对部分公交线路进行优化调整，新增1条线路，调整2条线路，取消1条线路，调整1条线路首末班车时间.同时，对1条线路进行线路延长试运营，对1条线路进行线路缩短试运营。此次调整后，我市公交线路总数将达到1000条，其中BRT线路13条,普通公交线路987条.
      `,
        `
        本报讯（记者陈鹏）昨天，记者从市交通委获悉，为进一步提升市民出行体验，我市将于 2021 年 6 月 30 日起，对部分公交线路进行优化调整，新增 1 条线路，调整 2 条线路，取消 1 条线路，调整 1 条线路首末班车时间。同时，对 1 条线路进行线路延长试运营，对 1 条线路进行线路缩短试运营。此次调整后，我市公交线路总数将达到 1000 条，其中 BRT 线路 13 条，普通公交线路 987 条。
      `,
      ],
      [
        `
        News from yesterday (Reporter Chen Peng): Yesterday, the reporter learned from the Municipal Transportation Commission that in order to further improve the travel experience of citizens, our city will adjust and optimize some bus routes from June 30, 2021, add 1 bus route, adjust 2 bus routes, and cancel 1 bus route. Adjust the first and last bus time of 1 bus route. At the same time, the operation of 1 bus route will be extended, and the operation of 1 bus route will be shortened. After this adjustment, the total number of bus routes in our city will reach 1000, including 13 BRT routes and 987 ordinary bus routes.
      `,
        `
        News from yesterday (Reporter Chen Peng): Yesterday, the reporter learned from the Municipal Transportation Commission that in order to further improve the travel experience of citizens, our city will adjust and optimize some bus routes from June 30, 2021, add 1 bus route, adjust 2 bus routes, and cancel 1 bus route. Adjust the first and last bus time of 1 bus route. At the same time, the operation of 1 bus route will be extended, and the operation of 1 bus route will be shortened. After this adjustment, the total number of bus routes in our city will reach 1000, including 13 BRT routes and 987 ordinary bus routes.
      `,
      ],
    ];

    for (const [i, o] of cases) t(i, o);
  });
});

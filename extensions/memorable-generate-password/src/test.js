function sleep1() {
  return new Promise((r) => {
    setTimeout(() => {
      console.log(1);
      r(0);
    }, 5000);
  });
}

function sleep2() {
  return new Promise((r) => {
    setTimeout(() => {
      console.log(2);
      r(0);
    }, 5000);
  });
}

const queue = [sleep1, sleep2];

async function start1() {
  // 等待所有任务都完成
  await Promise.all(
    queue.map(async (callback) => {
      await callback();
    })
  );

  // 去做其他的事情
  console.log("start1 任务完成");
}

async function start2() {
  if (queue.length == 0) return console.log("start2 任务完成");
  await queue[0]();
  queue.shift();
  start2();
}

start1();

start2();

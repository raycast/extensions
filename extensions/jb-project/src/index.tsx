import {
    ActionPanel,
    clearLocalStorage, closeMainWindow,
    Color,
    copyTextToClipboard,
    getLocalStorageItem,
    Icon,
    List, randomId,
    setLocalStorageItem,
    showHUD,
    showToast,
    ToastStyle,
    useNavigation,
    Detail
} from "@raycast/api";
import {homedir} from "os"
import {Config, Data, Product, Project, RecentProduct} from "./interfaces";
import fs from "fs";
import {exec} from "child_process";
import {getProductScore, initProduct} from "./handler/product";
import {useEffect, useState} from "react";
import {getRecentProduct} from "./handler/recentProduct";
import {recentProjectSetting} from "./handler/actions";


const config: Config = {
    supportProduct: [
        {appName:"DataGrip.app",productName: "DataGrip", command: "datagrip"},
        {appName:"PhpStorm.app",productName: "PhpStorm", command: "pstorm"},
        {appName:"AppCode.app",productName: "AppCode", command: "appcode"},
        {appName:"IntelliJ IDEA.app",productName: "IntelliJIdea", command: "idea"},
        {appName:"WebStorm.app",productName: "WebStorm", command: "webstorm"},
        {appName:"PyCharm.app",productName: "PyCharm", command: "charm"},
        {appName:"CLion.app",productName: "CLion", command: "clion"},
        {appName:"GoLand.app",productName: "GoLand", command: "goland"},
        {appName:"Rider.app",productName: "Rider", command: "rider"}
    ],
    installProdNames: [],
    configPath: {
        basePath: `${homedir()}/Library/Application Support/JetBrains/`,
        middlePath: "/options",
        fileName: "/recentProjects.xml"
    }
}

export default function Command() {

    const [state, setState] = useState<Data>();

    useEffect(() => {
        (async () => {
            const products = await initProduct(config, config.supportProduct);
            const recentProduct = await getRecentProduct();

            setState({
                recentProducts: recentProduct instanceof Array ? recentProduct : [],
                products: products
            });

        })();
    }, []);

    if (state?.products.length == 0) {
        return (
           <Readme></Readme> 
          );
    }
    state?.recentProducts.forEach(data => {
        state.products.map(project => {
            project.project.map(project => {
                if (data.project.name === project.name) {
                    data.project.opened = project.opened
                }
                data.project.duplication = project.duplication
            })
        })
    })


    return (
        <List>
            <List.Section title="Recent">
                {state?.recentProducts.map((project) => (
                        <List.Item id={project.project.id}
                                   title={project.project.name}
                                   icon={project.command + ".png"}
                                   accessoryTitle={(project.project.duplication ? project.project.path : "") }
                                   accessoryIcon={project.project.opened ? {source: Icon.Circle, tintColor: Color.Blue} : project.project.duplication ? {source: Icon.Circle, tintColor: Color.Red} : ""}
                                   actions={
                                       <ProjectActionPanel project={project.project}
                                                           productName={project.productName}
                                                           command={project.command}
                                                           displayName={project.displayName}
                                       />
                                   }
                        />
                    )
                )
                }
            </List.Section>
            {state?.products.map((product: Product) => {
                return (
                    <List.Section title={product.productName} subtitle={product.project.length+""}>
                        {product.project.map((project) => (
                                <List.Item key={project.id}
                                           title={project.name}
                                           icon={product.command + ".png"}
                                           accessoryTitle={project.duplication ? project.path : ""}
                                           // accessoryIcon={project.duplication ? {source: Icon.Dot, tintColor: Color.Red} : ""}
                                           accessoryIcon={project.opened ? {source: Icon.Circle, tintColor: Color.Blue} : project.duplication ? {source: Icon.Circle, tintColor: Color.Red} : ""}
                                           actions={
                                               <ProjectActionPanel project={project}
                                                                   productName={product.productName}
                                                                   command={product.command}
                                                                   displayName={product.displayName}
                                               />
                                           }
                                />
                            )
                        )
                        }
                    </List.Section>
                )
            })}
        </List>
    );
}


function recentProductSetting(productName: string) {
    getProductScore().then(data => {
        const result = Object.fromEntries(data);
        if (data.has(productName as string)) {
            const score = data.get(productName as string);
            if (score) {
                data.delete(productName as string);
                data.set(productName as string, score + 1);
            }
        } else {
            data.set(productName as string, 1);
        }

        const obj = Array.from(data).reduce((obj, [key, value]) => (
            Object.assign(obj, {[key]: value}) // Be careful! Maps can have non-String keys; object literals can't.
        ), {});
        setLocalStorageItem("productScore", JSON.stringify(obj))
    })
}

function ProjectActionPanel(props: { project: Project, productName: string, command: string, displayName: string }) {
    const { push } = useNavigation();
    const {project, productName, command, displayName} = props;
    return (
        <ActionPanel>
            <ActionPanel.Item title="Open"
                              icon={{source: Icon.Star}}
                              onAction={() => {
                                  const isExists = fs.existsSync(project.path)
                                  if (isExists) {
                                      const commandLine = `${command} ${project.path}`
                                      exec(`type ${command}`, (err, stdout, stderr) => {
                                          if (err) {
                                              showToast(ToastStyle.Failure, `Command ${command} not found`)
                                              return;
                                          }
                                          if (stderr) {
                                              showToast(ToastStyle.Failure, `Command ${command} not found`);
                                              return;
                                          }
                                          exec(commandLine, (error, stdout, stderr) => {
                                              if (error) {
                                                  showToast(ToastStyle.Failure, `error: ${error.message}`)
                                                  return;
                                              }
                                              if (stderr) {
                                                  console.log(`stderr: ${stderr}`);
                                                  return;
                                              }
                                              showHUD("👏🏻 Open Success")
                                              // 设置最近打开的项目
                                              recentProjectSetting(project, command, productName, displayName);
                                              // 设置最近打开的产品
                                              recentProductSetting(productName);
                                              closeMainWindow({ clearRootSearch: true });
                                          });
                                      })
                                  } else {
                                      showToast(ToastStyle.Failure, "Project Not Found")
                                  }
                              }}
            />
            <ActionPanel.Item title="Copy path" icon={{source: Icon.Clipboard}}
                              onAction={() => {
                                  copyTextToClipboard(project.path)
                                  showHUD("👋 Copied")
                              }
                              }/>
            <ActionPanel.Item title="Clear cache" icon={{source: Icon.Clipboard}}
                              onAction={() => {
                                  clearLocalStorage().then(() => {
                                      showToast(ToastStyle.Success, "👋 Success")
                                  })
                              }
                              }/>
            <ActionPanel.Item title="Guides" icon={{source: Icon.Clipboard}}
                              onAction={() => {
                                  push(<Readme />)
                              }
                              }/>
        </ActionPanel>
    );
}

function Readme() {
    const { pop } = useNavigation();

    return (
        <Detail
            markdown="
![CckXp3vOE54JGlHrAM7SXa3nThSkGlC6BP3JvdEQ.jpeg](https://s2.loli.net/2022/01/09/DawTCqFePW2LUnR.jpg)
# introduce
Support Jetbrains product
Intellij IDEA,WebStorm,PhpStorm,CLion,GoLand,Pycharm,Rider,DataGrip,AppCode.

![xi9NVm5IrhNPqx8wIeZQTBkZ9OMIKAhLLO5pvLV0.jpeg](https://s2.loli.net/2022/01/09/as3S5pH8LUjYonz.jpg)

How to use?
1. Install cli
	select menu `Tools` -> `Create Command-line Launcher`
	![CleanShot 2022-01-09 at 21.31.04@2x.png](https://s2.loli.net/2022/01/09/CR2FulSIyGXmsUV.png)
	![CleanShot 2022-01-09 at 21.31.39@2x.png](https://s2.loli.net/2022/01/09/A2Hj5aew6Rf3PYy.png)
"
            actions={
                <ActionPanel>
                    <ActionPanel.Item title="Pop" onAction={pop} />
                </ActionPanel>
            }
        />
    );
}


```fortran
subroutine slasdt (
        integer n,
        integer lvl,
        integer nd,
        integer, dimension( * ) inode,
        integer, dimension( * ) ndiml,
        integer, dimension( * ) ndimr,
        integer msub
)
```

SLASDT creates a tree of subproblems for bidiagonal divide and
conquer.

## Parameters
N : INTEGER [in]
> On entry, the number of diagonal elements of the
> bidiagonal matrix.

LVL : INTEGER [out]
> On exit, the number of levels on the computation tree.

ND : INTEGER [out]
> On exit, the number of nodes on the tree.

INODE : INTEGER array, dimension ( N ) [out]
> On exit, centers of subproblems.

NDIML : INTEGER array, dimension ( N ) [out]
> On exit, row dimensions of left children.

NDIMR : INTEGER array, dimension ( N ) [out]
> On exit, row dimensions of right children.

MSUB : INTEGER [in]
> On entry, the maximum row dimension each subproblem at the
> bottom of the tree can be of.

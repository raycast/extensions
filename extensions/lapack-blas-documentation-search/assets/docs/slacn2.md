```fortran
subroutine slacn2 (
        integer n,
        real, dimension( * ) v,
        real, dimension( * ) x,
        integer, dimension( * ) isgn,
        real est,
        integer kase,
        integer, dimension( 3 ) isave
)
```

SLACN2 estimates the 1-norm of a square, real matrix A.
Reverse communication is used for evaluating matrix-vector products.

## Parameters
N : INTEGER [in]
> The order of the matrix.  N >= 1.

V : REAL array, dimension (N) [out]
> On the final return, V = A\*W,  where  EST = norm(V)/norm(W)
> (W is not returned).

X : REAL array, dimension (N) [in,out]
> On an intermediate return, X should be overwritten by
> A \* X,   if KASE=1,
> A\*\*T \* X,  if KASE=2,
> and SLACN2 must be re-called with all the other parameters
> unchanged.

ISGN : INTEGER array, dimension (N) [out]

EST : REAL [in,out]
> On entry with KASE = 1 or 2 and ISAVE(1) = 3, EST should be
> unchanged from the previous call to SLACN2.
> On exit, EST is an estimate (a lower bound) for norm(A).

KASE : INTEGER [in,out]
> On the initial call to SLACN2, KASE should be 0.
> On an intermediate return, KASE will be 1 or 2, indicating
> whether X should be overwritten by A \* X  or A\*\*T \* X.
> On the final return from SLACN2, KASE will again be 0.

ISAVE : INTEGER array, dimension (3) [in,out]
> ISAVE is used to save variables between calls to SLACN2

```fortran
subroutine dlacn2 (
        integer n,
        double precision, dimension( * ) v,
        double precision, dimension( * ) x,
        integer, dimension( * ) isgn,
        double precision est,
        integer kase,
        integer, dimension( 3 ) isave
)
```

DLACN2 estimates the 1-norm of a square, real matrix A.
Reverse communication is used for evaluating matrix-vector products.

## Parameters
N : INTEGER [in]
> The order of the matrix.  N >= 1.

V : DOUBLE PRECISION array, dimension (N) [out]
> On the final return, V = A\*W,  where  EST = norm(V)/norm(W)
> (W is not returned).

X : DOUBLE PRECISION array, dimension (N) [in,out]
> On an intermediate return, X should be overwritten by
> A \* X,   if KASE=1,
> A\*\*T \* X,  if KASE=2,
> and DLACN2 must be re-called with all the other parameters
> unchanged.

ISGN : INTEGER array, dimension (N) [out]

EST : DOUBLE PRECISION [in,out]
> On entry with KASE = 1 or 2 and ISAVE(1) = 3, EST should be
> unchanged from the previous call to DLACN2.
> On exit, EST is an estimate (a lower bound) for norm(A).

KASE : INTEGER [in,out]
> On the initial call to DLACN2, KASE should be 0.
> On an intermediate return, KASE will be 1 or 2, indicating
> whether X should be overwritten by A \* X  or A\*\*T \* X.
> On the final return from DLACN2, KASE will again be 0.

ISAVE : INTEGER array, dimension (3) [in,out]
> ISAVE is used to save variables between calls to DLACN2

```fortran
subroutine dlagtf (
        integer n,
        double precision, dimension( * ) a,
        double precision lambda,
        double precision, dimension( * ) b,
        double precision, dimension( * ) c,
        double precision tol,
        double precision, dimension( * ) d,
        integer, dimension( * ) in,
        integer info
)
```

DLAGTF factorizes the matrix (T - lambda\*I), where T is an n by n
tridiagonal matrix and lambda is a scalar, as

T - lambda\*I = PLU,

where P is a permutation matrix, L is a unit lower tridiagonal matrix
with at most one non-zero sub-diagonal elements per column and U is
an upper triangular matrix with at most two non-zero super-diagonal
elements per column.

The factorization is obtained by Gaussian elimination with partial
pivoting and implicit row scaling.

The parameter LAMBDA is included in the routine so that DLAGTF may
be used, in conjunction with DLAGTS, to obtain eigenvectors of T by
inverse iteration.

## Parameters
N : INTEGER [in]
> The order of the matrix T.

A : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, A must contain the diagonal elements of T.
> 
> On exit, A is overwritten by the n diagonal elements of the
> upper triangular matrix U of the factorization of T.

LAMBDA : DOUBLE PRECISION [in]
> On entry, the scalar lambda.

B : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, B must contain the (n-1) super-diagonal elements of
> T.
> 
> On exit, B is overwritten by the (n-1) super-diagonal
> elements of the matrix U of the factorization of T.

C : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, C must contain the (n-1) sub-diagonal elements of
> T.
> 
> On exit, C is overwritten by the (n-1) sub-diagonal elements
> of the matrix L of the factorization of T.

TOL : DOUBLE PRECISION [in]
> On entry, a relative tolerance used to indicate whether or
> not the matrix (T - lambda\*I) is nearly singular. TOL should
> normally be chose as approximately the largest relative error
> in the elements of T. For example, if the elements of T are
> correct to about 4 significant figures, then TOL should be
> set to about 5\*10\*\*(-4). If TOL is supplied as less than eps,
> where eps is the relative machine precision, then the value
> eps is used in place of TOL.

D : DOUBLE PRECISION array, dimension (N-2) [out]
> On exit, D is overwritten by the (n-2) second super-diagonal
> elements of the matrix U of the factorization of T.

IN : INTEGER array, dimension (N) [out]
> On exit, IN contains details of the permutation matrix P. If
> an interchange occurred at the kth step of the elimination,
> then IN(k) = 1, otherwise IN(k) = 0. The element IN(n)
> returns the smallest positive integer j such that
> 
> abs( u(j,j) ) <= norm( (T - lambda\*I)(j) )\*TOL,
> 
> where norm( A(j) ) denotes the sum of the absolute values of
> the jth row of the matrix A. If no such j exists then IN(n)
> is returned as zero. If IN(n) is returned as positive, then a
> diagonal element of U is small, indicating that
> (T - lambda\*I) is singular or nearly singular,

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -k, the kth argument had an illegal value

```fortran
subroutine zptsv (
        integer n,
        integer nrhs,
        double precision, dimension( * ) d,
        complex*16, dimension( * ) e,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

ZPTSV computes the solution to a complex system of linear equations
A\*X = B, where A is an N-by-N Hermitian positive definite tridiagonal
matrix, and X and B are N-by-NRHS matrices.

A is factored as A = L\*D\*L\*\*H, and the factored form of A is then
used to solve the system of equations.

## Parameters
N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the n diagonal elements of the tridiagonal matrix
> A.  On exit, the n diagonal elements of the diagonal matrix
> D from the factorization A = L\*D\*L\*\*H.

E : COMPLEX\*16 array, dimension (N-1) [in,out]
> On entry, the (n-1) subdiagonal elements of the tridiagonal
> matrix A.  On exit, the (n-1) subdiagonal elements of the
> unit bidiagonal factor L from the L\*D\*L\*\*H factorization of
> A.  E can also be regarded as the superdiagonal of the unit
> bidiagonal factor U from the U\*\*H\*D\*U factorization of A.

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit, if INFO = 0, the N-by-NRHS solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the leading principal minor of order i
> is not positive, and the solution has not been
> computed.  The factorization has not been completed
> unless i = N.

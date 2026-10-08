```fortran
subroutine cgbsv (
        integer n,
        integer kl,
        integer ku,
        integer nrhs,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        integer, dimension( * ) ipiv,
        complex, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

CGBSV computes the solution to a complex system of linear equations
A \* X = B, where A is a band matrix of order N with KL subdiagonals
and KU superdiagonals, and X and B are N-by-NRHS matrices.

The LU decomposition with partial pivoting and row interchanges is
used to factor A as A = L \* U, where L is a product of permutation
and unit lower triangular matrices with KL subdiagonals, and U is
upper triangular with KL+KU superdiagonals.  The factored form of A
is then used to solve the system of equations A \* X = B.

## Parameters
N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

KL : INTEGER [in]
> The number of subdiagonals within the band of A.  KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals within the band of A.  KU >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in,out]
> On entry, the matrix A in band storage, in rows KL+1 to
> 2\*KL+KU+1; rows 1 to KL of the array need not be set.
> The j-th column of A is stored in the j-th column of the
> array AB as follows:
> AB(KL+KU+1+i-j,j) = A(i,j) for max(1,j-KU)<=i<=min(N,j+KL)
> On exit, details of the factorization: U is stored as an
> upper triangular band matrix with KL+KU superdiagonals in
> rows 1 to KL+KU+1, and the multipliers used during the
> factorization are stored in rows KL+KU+2 to 2\*KL+KU+1.
> See below for further details.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= 2\*KL+KU+1.

IPIV : INTEGER array, dimension (N) [out]
> The pivot indices that define the permutation matrix P;
> row i of the matrix was interchanged with row IPIV(i).

B : COMPLEX array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit, if INFO = 0, the N-by-NRHS solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, U(i,i) is exactly zero.  The factorization
> has been completed, but the factor U is exactly
> singular, and the solution has not been computed.

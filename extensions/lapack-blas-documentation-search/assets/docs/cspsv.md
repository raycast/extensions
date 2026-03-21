```fortran
subroutine cspsv (
        character uplo,
        integer n,
        integer nrhs,
        complex, dimension( * ) ap,
        integer, dimension( * ) ipiv,
        complex, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

CSPSV computes the solution to a complex system of linear equations
A \* X = B,
where A is an N-by-N symmetric matrix stored in packed format and X
and B are N-by-NRHS matrices.

The diagonal pivoting method is used to factor A as
A = U \* D \* U\*\*T,  if UPLO = 'U', or
A = L \* D \* L\*\*T,  if UPLO = 'L',
where U (or L) is a product of permutation and unit upper (lower)
triangular matrices, D is symmetric and block diagonal with 1-by-1
and 2-by-2 diagonal blocks.  The factored form of A is then used to
solve the system of equations A \* X = B.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the symmetric matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.
> See below for further details.
> 
> On exit, the block diagonal matrix D and the multipliers used
> to obtain the factor U or L from the factorization
> A = U\*D\*U\*\*T or A = L\*D\*L\*\*T as computed by CSPTRF, stored as
> a packed triangular matrix in the same storage format as A.

IPIV : INTEGER array, dimension (N) [out]
> Details of the interchanges and the block structure of D, as
> determined by CSPTRF.  If IPIV(k) > 0, then rows and columns
> k and IPIV(k) were interchanged, and D(k,k) is a 1-by-1
> diagonal block.  If UPLO = 'U' and IPIV(k) = IPIV(k-1) < 0,
> then rows and columns k-1 and -IPIV(k) were interchanged and
> D(k-1:k,k-1:k) is a 2-by-2 diagonal block.  If UPLO = 'L' and
> IPIV(k) = IPIV(k+1) < 0, then rows and columns k+1 and
> -IPIV(k) were interchanged and D(k:k+1,k:k+1) is a 2-by-2
> diagonal block.

B : COMPLEX array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit, if INFO = 0, the N-by-NRHS solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, D(i,i) is exactly zero.  The factorization
> has been completed, but the block diagonal matrix D is
> exactly singular, so the solution could not be
> computed.

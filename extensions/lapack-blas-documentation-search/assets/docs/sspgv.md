```fortran
subroutine sspgv (
        integer itype,
        character jobz,
        character uplo,
        integer n,
        real, dimension( * ) ap,
        real, dimension( * ) bp,
        real, dimension( * ) w,
        real, dimension( ldz, * ) z,
        integer ldz,
        real, dimension( * ) work,
        integer info
)
```

SSPGV computes all the eigenvalues and, optionally, the eigenvectors
of a real generalized symmetric-definite eigenproblem, of the form
A\*x=(lambda)\*B\*x,  A\*Bx=(lambda)\*x,  or B\*A\*x=(lambda)\*x.
Here A and B are assumed to be symmetric, stored in packed format,
and B is also positive definite.

## Parameters
ITYPE : INTEGER [in]
> Specifies the problem type to be solved:
> = 1:  A\*x = (lambda)\*B\*x
> = 2:  A\*B\*x = (lambda)\*x
> = 3:  B\*A\*x = (lambda)\*x

JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangles of A and B are stored;
> = 'L':  Lower triangles of A and B are stored.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

AP : REAL array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the symmetric matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2\*n-j)/2) = A(i,j) for j<=i<=n.
> 
> On exit, the contents of AP are destroyed.

BP : REAL array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the symmetric matrix
> B, packed columnwise in a linear array.  The j-th column of B
> is stored in the array BP as follows:
> if UPLO = 'U', BP(i + (j-1)\*j/2) = B(i,j) for 1<=i<=j;
> if UPLO = 'L', BP(i + (j-1)\*(2\*n-j)/2) = B(i,j) for j<=i<=n.
> 
> On exit, the triangular factor U or L from the Cholesky
> factorization B = U\*\*T\*U or B = L\*L\*\*T, in the same storage
> format as B.

W : REAL array, dimension (N) [out]
> If INFO = 0, the eigenvalues in ascending order.

Z : REAL array, dimension (LDZ, N) [out]
> If JOBZ = 'V', then if INFO = 0, Z contains the matrix Z of
> eigenvectors.  The eigenvectors are normalized as follows:
> if ITYPE = 1 or 2, Z\*\*T\*B\*Z = I;
> if ITYPE = 3, Z\*\*T\*inv(B)\*Z = I.
> If JOBZ = 'N', then Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(1,N).

WORK : REAL array, dimension (3\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  SPPTRF or SSPEV returned an error code:
> <= N:  if INFO = i, SSPEV failed to converge;
> i off-diagonal elements of an intermediate
> tridiagonal form did not converge to zero.
> > N:   if INFO = n + i, for 1 <= i <= n, then the leading
> principal minor of order i of B is not positive.
> The factorization of B could not be completed and
> no eigenvalues or eigenvectors were computed.

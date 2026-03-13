```fortran
subroutine csyconvf_rook (
        character uplo,
        character way,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( * ) e,
        integer, dimension( * ) ipiv,
        integer info
)
```

If parameter WAY = 'C':
CSYCONVF_ROOK converts the factorization output format used in
CSYTRF_ROOK provided on entry in parameter A into the factorization
output format used in CSYTRF_RK (or CSYTRF_BK) that is stored
on exit in parameters A and E. IPIV format for CSYTRF_ROOK and
CSYTRF_RK (or CSYTRF_BK) is the same and is not converted.

If parameter WAY = 'R':
CSYCONVF_ROOK performs the conversion in reverse direction, i.e.
converts the factorization output format used in CSYTRF_RK
(or CSYTRF_BK) provided on entry in parameters A and E into
the factorization output format used in CSYTRF_ROOK that is stored
on exit in parameter A. IPIV format for CSYTRF_ROOK and
CSYTRF_RK (or CSYTRF_BK) is the same and is not converted.

CSYCONVF_ROOK can also convert in Hermitian matrix case, i.e. between
formats used in CHETRF_ROOK and CHETRF_RK (or CHETRF_BK).

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are
> stored as an upper or lower triangular matrix A.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

WAY : CHARACTER\*1 [in]
> = 'C': Convert
> = 'R': Revert

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> 
> 1) If WAY ='C':
> 
> On entry, contains factorization details in format used in
> CSYTRF_ROOK:
> a) all elements of the symmetric block diagonal
> matrix D on the diagonal of A and on superdiagonal
> (or subdiagonal) of A, and
> b) If UPLO = 'U': multipliers used to obtain factor U
> in the superdiagonal part of A.
> If UPLO = 'L': multipliers used to obtain factor L
> in the superdiagonal part of A.
> 
> On exit, contains factorization details in format used in
> CSYTRF_RK or CSYTRF_BK:
> a) ONLY diagonal elements of the symmetric block diagonal
> matrix D on the diagonal of A, i.e. D(k,k) = A(k,k);
> (superdiagonal (or subdiagonal) elements of D
> are stored on exit in array E), and
> b) If UPLO = 'U': factor U in the superdiagonal part of A.
> If UPLO = 'L': factor L in the subdiagonal part of A.
> 
> 2) If WAY = 'R':
> 
> On entry, contains factorization details in format used in
> CSYTRF_RK or CSYTRF_BK:
> a) ONLY diagonal elements of the symmetric block diagonal
> matrix D on the diagonal of A, i.e. D(k,k) = A(k,k);
> (superdiagonal (or subdiagonal) elements of D
> are stored on exit in array E), and
> b) If UPLO = 'U': factor U in the superdiagonal part of A.
> If UPLO = 'L': factor L in the subdiagonal part of A.
> 
> On exit, contains factorization details in format used in
> CSYTRF_ROOK:
> a) all elements of the symmetric block diagonal
> matrix D on the diagonal of A and on superdiagonal
> (or subdiagonal) of A, and
> b) If UPLO = 'U': multipliers used to obtain factor U
> in the superdiagonal part of A.
> If UPLO = 'L': multipliers used to obtain factor L
> in the superdiagonal part of A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

E : COMPLEX array, dimension (N) [in,out]
> 
> 1) If WAY ='C':
> 
> On entry, just a workspace.
> 
> On exit, contains the superdiagonal (or subdiagonal)
> elements of the symmetric block diagonal matrix D
> with 1-by-1 or 2-by-2 diagonal blocks, where
> If UPLO = 'U': E(i) = D(i-1,i), i=2:N, E(1) is set to 0;
> If UPLO = 'L': E(i) = D(i+1,i), i=1:N-1, E(N) is set to 0.
> 
> 2) If WAY = 'R':
> 
> On entry, contains the superdiagonal (or subdiagonal)
> elements of the symmetric block diagonal matrix D
> with 1-by-1 or 2-by-2 diagonal blocks, where
> If UPLO = 'U': E(i) = D(i-1,i),i=2:N, E(1) not referenced;
> If UPLO = 'L': E(i) = D(i+1,i),i=1:N-1, E(N) not referenced.
> 
> On exit, is not changed

IPIV : INTEGER array, dimension (N) [in]
> On entry, details of the interchanges and the block
> structure of D as determined:
> 1) by CSYTRF_ROOK, if WAY ='C';
> 2) by CSYTRF_RK (or CSYTRF_BK), if WAY ='R'.
> The IPIV format is the same for all these routines.
> 
> On exit, is not changed.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
